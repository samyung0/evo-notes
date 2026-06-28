// Command api is the Evo Notes gateway: a thin Go HTTP server that implements
// the frontend's /api contract against Postgres. Heavy ML (parsing, RAG) lives
// in the Python pipeline service and is reached via an async job queue + HTTP.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/evonotes/server/internal/blob"
	"github.com/evonotes/server/internal/httpapi"
	"github.com/evonotes/server/internal/pipeline"
	"github.com/evonotes/server/internal/store"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	dsn := env("DATABASE_URL", "postgres://evo:evo@localhost:5432/evo?sslmode=disable")
	addr := env("ADDR", ":8080")
	blobDir := env("BLOB_DIR", "./data/blobs")
	parser := env("EVO_PARSER", "docling") // pinned parser at deploy
	engine := env("EVO_ENGINE", "linearrag")

	ctx := context.Background()
	st, err := store.New(ctx, dsn)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer st.Close()

	blobStore, err := blob.NewDisk(blobDir)
	if err != nil {
		log.Fatalf("blob store: %v", err)
	}

	// Pipeline (retrieval/generate) is optional: nil → local placeholders.
	var pipe *pipeline.Client
	if u := env("PIPELINE_URL", ""); u != "" {
		pipe = pipeline.New(u)
		log.Printf("pipeline at %s", u)
	}

	// Redis is optional: nil → ingest-progress SSE endpoint returns 503. The
	// Python worker publishes progress here; we fan it out to the browser.
	var rdb *redis.Client
	if u := env("REDIS_URL", ""); u != "" {
		opt, err := redis.ParseURL(u)
		if err != nil {
			log.Fatalf("redis url: %v", err)
		}
		rdb = redis.NewClient(opt)
		defer rdb.Close()
		log.Printf("redis at %s", opt.Addr)
	}

	if env("MIGRATE", "true") == "true" {
		if err := st.Migrate(ctx); err != nil {
			log.Fatalf("migrate: %v", err)
		}
		log.Println("migrations applied")
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           httpapi.New(st, blobStore, pipe, rdb, parser, engine),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("evo-notes gateway listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("shutting down…")
	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutCtx)
}
