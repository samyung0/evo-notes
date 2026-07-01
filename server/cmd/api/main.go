package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/evonotes/server/internal/blob"
	"github.com/evonotes/server/internal/httpapi"
	"github.com/evonotes/server/internal/integrations"
	"github.com/evonotes/server/internal/pipeline"
	"github.com/evonotes/server/internal/store"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envBool(key string) bool {
	return os.Getenv(key) == "true"
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func main() {
	dsn := env("DATABASE_URL", "postgres://evo:evo@localhost:5432/evo?sslmode=disable")
	addr := env("ADDR", ":8080")
	blobDir := env("BLOB_DIR", "./data/blobs")
	parser := env("EVO_PARSER", "docling")
	engine := env("EVO_ENGINE", "linearrag")
	appURL := env("APP_URL", "http://localhost:5173")

	ctx := context.Background()
	st, err := store.New(ctx, dsn)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer st.Close()

	var blobStore blob.Store
	switch backend := env("BLOB_BACKEND", "disk"); backend {
	case "b2", "s3":
		s3store, e := blob.NewS3(blob.S3Config{
			Endpoint:     env("B2_ENDPOINT", ""),
			Region:       env("B2_REGION", ""),
			Bucket:       env("B2_BUCKET", ""),
			KeyID:        env("B2_KEY_ID", ""),
			AppKey:       env("B2_APP_KEY", ""),
			UsePathStyle: envBool("B2_FORCE_PATH_STYLE"),
			PresignTTL:   time.Duration(envInt("B2_PRESIGN_TTL", 900)) * time.Second,
		})
		if e != nil {
			log.Fatalf("blob store (%s): %v", backend, e)
		}
		hctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		if err := s3store.HealthCheck(hctx); err != nil {
			cancel()
			log.Fatalf("blob store (%s) unreachable — check B2_* config: %v", backend, err)
		}
		cancel()
		blobStore = s3store
		log.Printf("blob store: %s bucket=%s (presigned URLs)", backend, env("B2_BUCKET", ""))
	default:
		blobStore, err = blob.NewDisk(blobDir)
		if err != nil {
			log.Fatalf("blob store: %v", err)
		}
		log.Printf("blob store: disk dir=%s", blobDir)
	}

	var pipe *pipeline.Client
	if u := env("PIPELINE_URL", ""); u != "" {
		pipe = pipeline.New(u)
		log.Printf("pipeline at %s", u)
	}

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

	cfg := httpapi.Config{
		ClerkSecretKey:      env("CLERK_SECRET_KEY", ""),
		ClerkWebhookSecret:  env("CLERK_WEBHOOK_SECRET", ""),
		AuthDisabled:        envBool("AUTH_DISABLED"),
		DevUserID:           env("DEV_USER_ID", "u_1"),
		StripeSecretKey:     env("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
		StripePricePro:      env("STRIPE_PRICE_PRO", ""),
		StripePriceTeam:     env("STRIPE_PRICE_TEAM", ""),
		AppURL:              appURL,
		OAuth: integrations.OAuthConfig{
			GoogleClientID:        env("GOOGLE_OAUTH_CLIENT_ID", ""),
			GoogleClientSecret:    env("GOOGLE_OAUTH_CLIENT_SECRET", ""),
			MicrosoftClientID:     env("MICROSOFT_OAUTH_CLIENT_ID", ""),
			MicrosoftClientSecret: env("MICROSOFT_OAUTH_CLIENT_SECRET", ""),
			RedirectBaseURL:       env("OAUTH_REDIRECT_BASE_URL", "http://localhost:8080"),
		},
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           httpapi.New(st, blobStore, pipe, rdb, parser, engine, cfg),
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
