package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/redis/go-redis/v9"

	"github.com/evonotes/server/internal/auth"
	"github.com/evonotes/server/internal/billing"
	"github.com/evonotes/server/internal/blob"
	"github.com/evonotes/server/internal/integrations"
	"github.com/evonotes/server/internal/pipeline"
	"github.com/evonotes/server/internal/store"
)

// Config holds gateway settings for auth, billing, and OAuth.
type Config struct {
	ClerkSecretKey      string
	ClerkWebhookSecret  string
	AuthDisabled        bool
	DevUserID           string
	StripeSecretKey     string
	StripeWebhookSecret string
	StripePricePro      string
	StripePriceTeam     string
	AppURL              string
	OAuth               integrations.OAuthConfig
}

type api struct {
	s      *store.Store
	blob   blob.Store
	pipe   *pipeline.Client
	rdb    *redis.Client
	parser string
	engine string
	cfg    Config
	oauth  integrations.OAuthConfig
}

// New builds the full HTTP handler: CORS, health check, and the /api routes
// that mirror src/mocks/handlers.ts 1:1.
func New(s *store.Store, b blob.Store, pipe *pipeline.Client, rdb *redis.Client, parser, engine string, cfg Config) http.Handler {
	billing.Init(billing.Config{SecretKey: cfg.StripeSecretKey})
	a := &api{s: s, blob: b, pipe: pipe, rdb: rdb, parser: parser, engine: engine, cfg: cfg, oauth: cfg.OAuth}
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: false,
	}))
	r.Use(auth.Middleware(auth.Config{
		SecretKey: cfg.ClerkSecretKey,
		Disabled:  cfg.AuthDisabled,
		DevUserID: cfg.DevUserID,
		Store:     s,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	r.Post("/webhooks/clerk", a.clerkWebhook)
	r.Post("/webhooks/stripe", a.stripeWebhook)
	r.Get("/api/integrations/google/callback", a.googleCallback)
	r.Get("/api/integrations/microsoft/callback", a.microsoftCallback)

	r.Route("/api", func(r chi.Router) {
		r.Get("/me", a.me)
		r.Get("/search", a.search)
		r.Get("/notifications", a.notifications)
		r.Post("/notifications/read", a.markRead)

		r.Route("/workspaces", func(r chi.Router) {
			r.Get("/", a.listWorkspaces)
			r.Post("/", a.createWorkspace)
			r.Get("/{id}", a.getWorkspace)
			r.Patch("/{id}", a.updateWorkspace)
			r.Delete("/{id}", a.deleteWorkspace)
			r.Get("/{id}/stats", a.workspaceStats)
			r.Get("/{id}/chapters", a.listChapters)
			r.Post("/{id}/chapters", a.addChapter)
			r.Post("/{id}/chapters/reorder", a.reorderChapters)
			r.Get("/{id}/files", a.listWorkspaceFiles)
			r.Post("/{id}/sources", a.addSource)
			r.Post("/{id}/sources/import", a.importSources)
			r.Get("/{id}/ingest-events", a.ingestEvents)
			r.Post("/{id}/chat", a.chat)
			r.Post("/{id}/generate", a.generate)
		})

		r.Patch("/chapters/{id}", a.updateChapter)
		r.Delete("/chapters/{id}", a.deleteChapter)

		r.Get("/files", a.listAllFiles)
		r.Get("/files/{id}", a.getFile)
		r.Get("/files/{id}/raw", a.getFileRaw)

		r.Get("/quizzes", a.listQuizzes)
		r.Post("/quizzes", a.createQuiz)
		r.Get("/mistakes", a.mistakes)
		r.Get("/quizzes/{id}", a.getQuiz)
		r.Patch("/quizzes/{id}", a.updateQuiz)
		r.Delete("/quizzes/{id}", a.deleteQuiz)
		r.Post("/quizzes/{id}/attempts", a.createAttempt)
		r.Get("/attempts", a.listAttempts)

		r.Get("/decks", a.listDecks)
		r.Post("/decks", a.createDeck)
		r.Get("/decks/{id}", a.getDeck)
		r.Get("/decks/{id}/cards", a.listCards)
		r.Post("/decks/{id}/cards", a.createCard)
		r.Patch("/cards/{id}", a.updateCard)
		r.Delete("/cards/{id}", a.deleteCard)

		r.Get("/events", a.listEvents)
		r.Post("/events", a.createEvent)
		r.Patch("/events/{id}", a.updateEvent)
		r.Delete("/events/{id}", a.deleteEvent)
		r.Get("/labels", a.listLabels)

		r.Get("/tasks", a.listTasks)
		r.Patch("/tasks/{id}", a.updateTask)

		r.Get("/thinking", a.listCanvases)
		r.Post("/thinking", a.createCanvas)
		r.Get("/thinking/{id}", a.getCanvas)
		r.Put("/thinking/{id}", a.saveCanvas)

		r.Get("/explore/workspaces", a.exploreWorkspaces)
		r.Get("/explore/quizzes", a.exploreQuizzes)

		r.Get("/billing", a.getBilling)
		r.Post("/billing/checkout", a.billingCheckout)
		r.Post("/billing/portal", a.billingPortal)

		r.Get("/integrations", a.integrationsStatus)
		r.Get("/integrations/google/connect", a.googleConnect)
		r.Get("/integrations/google/picker-token", a.googlePickerToken)
		r.Get("/integrations/microsoft/connect", a.microsoftConnect)
		r.Get("/integrations/microsoft/recent", a.microsoftRecentFiles)
		r.Delete("/integrations/{provider}", a.deleteIntegration)
	})

	return r
}

/* ------------------------------------------------------------------ helpers */

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func noContent(w http.ResponseWriter) { w.WriteHeader(http.StatusNoContent) }

func decode(r *http.Request, v any) error { return json.NewDecoder(r.Body).Decode(v) }

func (a *api) fail(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"message": "not found"})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
}

func id(r *http.Request) string { return chi.URLParam(r, "id") }

func randID(prefix string) string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func randInt(min, max int) int {
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(max-min)))
	return min + int(n.Int64())
}

/* ----------------------------------------------------------- shell handlers */

func uid(r *http.Request) string { return auth.UserID(r.Context()) }

func (a *api) me(w http.ResponseWriter, r *http.Request) {
	u, err := a.s.Me(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, u)
}

func (a *api) search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, 200, []store.SearchResult{})
		return
	}
	res, err := a.s.Search(r.Context(), uid(r), q)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) notifications(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.Notifications(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) markRead(w http.ResponseWriter, r *http.Request) {
	if err := a.s.MarkNotificationsRead(r.Context(), uid(r)); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

/* ------------------------------------------------------- workspace handlers */

func (a *api) listWorkspaces(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	res, err := a.s.ListWorkspaces(r.Context(), uid(r), q.Get("q"), q.Get("sort"), q.Get("color"), q.Get("tag"))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) getWorkspace(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.GetWorkspace(r.Context(), uid(r), id(r), true)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) workspaceStats(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.WorkspaceStats(r.Context(), uid(r), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) createWorkspace(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Name    string   `json:"name"`
		Color   string   `json:"color"`
		Privacy string   `json:"privacy"`
		Tags    []string `json:"tags"`
	}
	_ = decode(r, &b)
	if b.Name == "" {
		b.Name = "Untitled workspace"
	}
	if b.Color == "" {
		b.Color = "green"
	}
	if b.Privacy == "" {
		b.Privacy = "private"
	}
	if b.Tags == nil {
		b.Tags = []string{}
	}
	res, err := a.s.CreateWorkspace(r.Context(), uid(r), b.Name, b.Color, b.Privacy, b.Tags)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) updateWorkspace(w http.ResponseWriter, r *http.Request) {
	var p store.WorkspacePatch
	if err := decode(r, &p); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.UpdateWorkspace(r.Context(), uid(r), id(r), p)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) deleteWorkspace(w http.ResponseWriter, r *http.Request) {
	if err := a.s.DeleteWorkspace(r.Context(), uid(r), id(r)); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

/* --------------------------------------------------- chapter/file handlers */

func (a *api) assertWS(w http.ResponseWriter, r *http.Request, wsID string) bool {
	if err := a.s.AssertWorkspaceOwner(r.Context(), uid(r), wsID); err != nil {
		a.fail(w, err)
		return false
	}
	return true
}

func (a *api) listChapters(w http.ResponseWriter, r *http.Request) {
	wsID := id(r)
	if !a.assertWS(w, r, wsID) {
		return
	}
	res, err := a.s.ListChapters(r.Context(), wsID)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) addChapter(w http.ResponseWriter, r *http.Request) {
	wsID := id(r)
	if !a.assertWS(w, r, wsID) {
		return
	}
	var b struct {
		Name string `json:"name"`
	}
	_ = decode(r, &b)
	res, err := a.s.AddChapter(r.Context(), wsID, b.Name)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) updateChapter(w http.ResponseWriter, r *http.Request) {
	var p store.ChapterPatch
	if err := decode(r, &p); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.UpdateChapter(r.Context(), id(r), p)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) reorderChapters(w http.ResponseWriter, r *http.Request) {
	if !a.assertWS(w, r, id(r)) {
		return
	}
	var b struct {
		IDs []string `json:"ids"`
	}
	if err := decode(r, &b); err != nil {
		a.fail(w, err)
		return
	}
	if err := a.s.ReorderChapters(r.Context(), b.IDs); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

func (a *api) deleteChapter(w http.ResponseWriter, r *http.Request) {
	if err := a.s.DeleteChapter(r.Context(), id(r)); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

func (a *api) listAllFiles(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListFiles(r.Context(), uid(r), "")
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) listWorkspaceFiles(w http.ResponseWriter, r *http.Request) {
	wsID := id(r)
	if !a.assertWS(w, r, wsID) {
		return
	}
	res, err := a.s.ListFiles(r.Context(), uid(r), wsID)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) getFile(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.GetFile(r.Context(), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

// addSource handles both the real upload (multipart: stores bytes, marks the
// file 'processing', enqueues an ingest job) and the mock-compatible JSON
// metadata path (no bytes, lands 'ready').
func (a *api) addSource(w http.ResponseWriter, r *http.Request) {
	if !a.assertWS(w, r, id(r)) {
		return
	}
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		a.uploadSource(w, r)
		return
	}
	var b struct {
		Name      string  `json:"name"`
		Kind      string  `json:"kind"`
		ChapterID *string `json:"chapterId"`
	}
	if err := decode(r, &b); err != nil {
		a.fail(w, err)
		return
	}
	if b.Kind == "" {
		b.Kind = "pdf"
	}
	res, err := a.s.AddSource(r.Context(), id(r), b.Name, b.Kind, b.ChapterID, randInt(200, 3200))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) uploadSource(w http.ResponseWriter, r *http.Request) {
	if a.blob == nil {
		a.fail(w, errors.New("blob store not configured"))
		return
	}
	if err := r.ParseMultipartForm(64 << 20); err != nil { // 64 MiB
		a.fail(w, err)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		a.fail(w, err)
		return
	}
	defer file.Close()

	name := r.FormValue("name")
	if name == "" {
		name = hdr.Filename
	}
	kind := r.FormValue("kind")
	if kind == "" {
		kind = kindFromName(name)
	}
	var chapterID *string
	if c := r.FormValue("chapterId"); c != "" {
		chapterID = &c
	}

	blobPath, size, err := a.blob.Put(randID("blob"), file)
	if err != nil {
		a.fail(w, err)
		return
	}
	res, _, err := a.s.CreateSourceWithJob(r.Context(), id(r), name, kind, chapterID, int(size/1024), blobPath, a.parser, a.engine)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) getFileRaw(w http.ResponseWriter, r *http.Request) {
	blobPath, kind, content, url, err := a.s.FileBlob(r.Context(), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	switch {
	case blobPath != "" && a.blob != nil:
		// Object stores (S3/B2) redirect to a short-lived presigned URL so the
		// bytes never proxy through the gateway. Disk has no presigner and
		// streams inline.
		if p, ok := a.blob.(blob.Presigner); ok {
			signed, err := p.PresignGet(r.Context(), blobPath)
			if err != nil {
				a.fail(w, err)
				return
			}
			http.Redirect(w, r, signed, http.StatusFound)
			return
		}
		rc, err := a.blob.Open(blobPath)
		if err != nil {
			a.fail(w, err)
			return
		}
		defer rc.Close()
		w.Header().Set("Content-Type", contentType(kind))
		_, _ = io.Copy(w, rc)
	case content != nil:
		w.Header().Set("Content-Type", contentType(kind))
		_, _ = w.Write([]byte(*content))
	case url != nil && *url != "" && !strings.HasPrefix(*url, "/api/"):
		http.Redirect(w, r, *url, http.StatusFound)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"message": "no content"})
	}
}

func kindFromName(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".pdf":
		return "pdf"
	case ".doc", ".docx":
		return "doc"
	case ".md", ".markdown":
		return "md"
	case ".png", ".jpg", ".jpeg", ".gif", ".webp":
		return "image"
	default:
		return "txt"
	}
}

func contentType(kind string) string {
	switch kind {
	case "pdf":
		return "application/pdf"
	case "md", "txt", "doc":
		return "text/plain; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}

/* ------------------------------------------------------- quiz/attempt handlers */

func (a *api) listQuizzes(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListQuizzes(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) getQuiz(w http.ResponseWriter, r *http.Request) {
	// "review_mistakes" is a virtual quiz assembled from the user's mistakes pool.
	if id(r) == "review_mistakes" {
		a.mistakes(w, r)
		return
	}
	res, err := a.s.GetQuiz(r.Context(), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

// createQuiz makes an empty quiz (for the "New quiz" editor). With no workspace
// supplied it attaches to the user's most recent one so it lists correctly.
func (a *api) createQuiz(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Name         string          `json:"name"`
		WorkspaceID  string          `json:"workspaceId"`
		Chapters     []string        `json:"chapters"`
		Questions    json.RawMessage `json:"questions"`
		Privacy      string          `json:"privacy"`
		TimeLimitMin *int            `json:"timeLimitMin"`
	}
	_ = decode(r, &b)
	if b.Name == "" {
		b.Name = "Untitled quiz"
	}
	if b.Privacy == "" {
		b.Privacy = "private"
	}
	wsID, wsName := b.WorkspaceID, "Workspace"
	if wsID == "" {
		if list, err := a.s.ListWorkspaces(r.Context(), uid(r), "", "", "", ""); err == nil && len(list) > 0 {
			wsID, wsName = list[0].ID, list[0].Name
		}
	} else if ws, err := a.s.GetWorkspace(r.Context(), uid(r), wsID, false); err == nil {
		wsName = ws.Name
	}
	res, err := a.s.CreateQuiz(r.Context(), store.Quiz{
		Name: b.Name, WorkspaceID: wsID, WorkspaceName: wsName, Chapters: b.Chapters,
		Questions: b.Questions, Privacy: b.Privacy, TimeLimitMin: b.TimeLimitMin,
	})
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) mistakes(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.MistakesQuiz(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) updateQuiz(w http.ResponseWriter, r *http.Request) {
	var p store.QuizPatch
	if err := decode(r, &p); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.UpdateQuiz(r.Context(), id(r), p)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) deleteQuiz(w http.ResponseWriter, r *http.Request) {
	if err := a.s.DeleteQuiz(r.Context(), id(r)); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

func (a *api) listAttempts(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListAttempts(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) createAttempt(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Correct int               `json:"correct"`
		Total   int               `json:"total"`
		Wrong   []json.RawMessage `json:"wrong"`
	}
	if err := decode(r, &b); err != nil {
		a.fail(w, err)
		return
	}
	quizID := id(r)
	if len(b.Wrong) > 0 {
		_ = a.s.AddMistakes(r.Context(), uid(r), b.Wrong)
	}
	// A review-mistakes attempt prunes everything answered correctly this round:
	// only the questions still in b.Wrong remain in the pool.
	if quizID == "review_mistakes" {
		_ = a.s.ClearMistakesExcept(r.Context(), uid(r), questionIDs(b.Wrong))
	}
	res, err := a.s.CreateAttempt(r.Context(), quizID, b.Correct, b.Total)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func questionIDs(raw []json.RawMessage) []string {
	ids := make([]string, 0, len(raw))
	for _, r := range raw {
		var head struct {
			ID string `json:"id"`
		}
		if json.Unmarshal(r, &head) == nil && head.ID != "" {
			ids = append(ids, head.ID)
		}
	}
	return ids
}

/* ---------------------------------------------------------- flashcard handlers */

func (a *api) listDecks(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListDecks(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) getDeck(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.GetDeck(r.Context(), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) createDeck(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Name        string `json:"name"`
		Color       string `json:"color"`
		WorkspaceID string `json:"workspaceId"`
	}
	_ = decode(r, &b)
	res, err := a.s.CreateDeck(r.Context(), uid(r), b.Name, b.Color, b.WorkspaceID)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) createCard(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Front string `json:"front"`
		Back  string `json:"back"`
	}
	_ = decode(r, &b)
	res, err := a.s.CreateCard(r.Context(), id(r), b.Front, b.Back)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) deleteCard(w http.ResponseWriter, r *http.Request) {
	if err := a.s.DeleteCard(r.Context(), id(r)); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

func (a *api) listCards(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListCards(r.Context(), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) updateCard(w http.ResponseWriter, r *http.Request) {
	var p store.CardPatch
	if err := decode(r, &p); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.UpdateCard(r.Context(), id(r), p)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

/* ------------------------------------------------------------ schedule handlers */

func (a *api) listEvents(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListEvents(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) createEvent(w http.ResponseWriter, r *http.Request) {
	var e store.Event
	if err := decode(r, &e); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.CreateEvent(r.Context(), uid(r), e)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) updateEvent(w http.ResponseWriter, r *http.Request) {
	var p store.EventPatch
	if err := decode(r, &p); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.UpdateEvent(r.Context(), id(r), p)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) deleteEvent(w http.ResponseWriter, r *http.Request) {
	if err := a.s.DeleteEvent(r.Context(), id(r)); err != nil {
		a.fail(w, err)
		return
	}
	noContent(w)
}

func (a *api) listLabels(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListLabels(r.Context())
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

/* ---------------------------------------------------------------- task handlers */

func (a *api) listTasks(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListTasks(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) updateTask(w http.ResponseWriter, r *http.Request) {
	var p store.TaskPatch
	if err := decode(r, &p); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.UpdateTask(r.Context(), id(r), p)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

/* ------------------------------------------------------------ thinking handlers */

func (a *api) listCanvases(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListCanvases(r.Context(), uid(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) getCanvas(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.GetCanvas(r.Context(), id(r))
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) createCanvas(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Name string `json:"name"`
	}
	_ = decode(r, &b)
	res, err := a.s.CreateCanvas(r.Context(), uid(r), b.Name)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 201, res)
}

func (a *api) saveCanvas(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Name  *string         `json:"name"`
		Scene json.RawMessage `json:"scene"`
	}
	if err := decode(r, &b); err != nil {
		a.fail(w, err)
		return
	}
	res, err := a.s.SaveCanvas(r.Context(), id(r), b.Name, b.Scene)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

/* ------------------------------------------------------------- explore handlers */

func (a *api) exploreWorkspaces(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListPublicWorkspaces(r.Context())
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

func (a *api) exploreQuizzes(w http.ResponseWriter, r *http.Request) {
	res, err := a.s.ListPublicQuizzes(r.Context())
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, res)
}

/* -------------------------------------------------------------- chat/generate

   Phase 1 placeholders: shapes match the frontend (ChatMessage / generate
   payloads) so the UI works end-to-end. Phase 3 replaces these with calls to
   the Python retrieval service. */

func (a *api) chat(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Text string `json:"text"`
	}
	_ = decode(r, &b)

	// Preferred path: grounded answer from the retrieval service.
	if a.pipe != nil {
		if raw, err := a.pipe.PostRaw(r.Context(), "/chat", map[string]any{"query": b.Text, "workspaceId": id(r), "k": 6}); err == nil {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(raw)
			return
		}
	}

	// Fallback placeholder (pipeline unreachable).
	files, _ := a.s.ListFiles(r.Context(), uid(r), id(r))
	if len(files) > 2 {
		files = files[:2]
	}
	cites := make([]map[string]string, 0, len(files))
	for _, f := range files {
		cites = append(cites, map[string]string{"fileId": f.ID, "fileName": f.Name, "snippet": "Relevant passage from your source…"})
	}
	writeJSON(w, 200, map[string]any{
		"id":        randID("m"),
		"role":      "assistant",
		"text":      fmt.Sprintf("Based on your sources, %s relates to the key ideas in your materials. (Pipeline offline — showing a placeholder.)", b.Text),
		"citations": cites,
	})
}

type generateOpts struct {
	Kind         string   `json:"kind"`
	Length       string   `json:"length"`
	Format       string   `json:"format"`
	Count        int      `json:"count"`
	Style        string   `json:"style"`
	Types        []string `json:"types"`
	Levels       []string `json:"levels"`      // cognitive levels: recall|application|analysis
	Difficulty   []string `json:"difficulty"`  // legacy alias, still accepted
	Chapters     []string `json:"chapters"`
	TimeLimitMin *int     `json:"timeLimitMin"`
}

// cognitiveLevels resolves the requested levels, accepting the legacy
// difficulty field and mapping its values onto the new labels.
func (o generateOpts) cognitiveLevels() []string {
	if len(o.Levels) > 0 {
		return o.Levels
	}
	if len(o.Difficulty) > 0 {
		mapped := make([]string, 0, len(o.Difficulty))
		for _, d := range o.Difficulty {
			switch d {
			case "easy":
				mapped = append(mapped, "recall")
			case "hard":
				mapped = append(mapped, "analysis")
			default:
				mapped = append(mapped, "application")
			}
		}
		return mapped
	}
	return []string{"recall", "application"}
}

func (a *api) generate(w http.ResponseWriter, r *http.Request) {
	var opts generateOpts
	if err := decode(r, &opts); err != nil {
		a.fail(w, err)
		return
	}
	wsID := id(r)
	wsName := "Workspace"
	if ws, err := a.s.GetWorkspace(r.Context(), uid(r), wsID, false); err == nil {
		wsName = ws.Name
	}

	if a.pipe != nil {
		if payload, ok := a.generateViaPipe(r.Context(), wsID, wsName, &opts); ok {
			writeJSON(w, 200, payload)
			return
		}
	}
	payload, err := a.generateLocal(r.Context(), wsID, wsName, opts)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, payload)
}

// generateViaPipe asks the retrieval service to produce grounded output. For a
// quiz it persists the returned questions so they appear under /quizzes.
func (a *api) generateViaPipe(ctx context.Context, wsID, wsName string, opts *generateOpts) (any, bool) {
	body := map[string]any{
		"workspaceId": wsID, "kind": opts.Kind, "length": opts.Length, "format": opts.Format,
		"count": opts.Count, "style": opts.Style, "types": opts.Types, "levels": opts.cognitiveLevels(),
		"chapters": opts.Chapters, "timeLimitMin": opts.TimeLimitMin,
	}
	raw, err := a.pipe.PostRaw(ctx, "/generate", body)
	if err != nil {
		return nil, false
	}
	var head struct {
		Kind string `json:"kind"`
	}
	if json.Unmarshal(raw, &head) != nil {
		return nil, false
	}
	if head.Kind == "quiz" {
		var qp struct {
			Name         string          `json:"name"`
			Chapters     []string        `json:"chapters"`
			Questions    json.RawMessage `json:"questions"`
			TimeLimitMin *int            `json:"timeLimitMin"`
		}
		_ = json.Unmarshal(raw, &qp)
		name := qp.Name
		if name == "" {
			name = wsName + " quiz"
		}
		chapters := qp.Chapters
		if chapters == nil {
			chapters = opts.Chapters
		}
		quiz, err := a.s.CreateQuiz(ctx, store.Quiz{
			Name: name, WorkspaceID: wsID, WorkspaceName: wsName, Chapters: chapters,
			Questions: qp.Questions, Privacy: "private", TimeLimitMin: qp.TimeLimitMin,
		})
		if err != nil {
			return nil, false
		}
		return map[string]any{"kind": "quiz", "quiz": quiz}, true
	}
	var m map[string]any
	if json.Unmarshal(raw, &m) != nil {
		return nil, false
	}
	return m, true
}

// generateLocal is the offline fallback (and the mock-parity generator).
func (a *api) generateLocal(ctx context.Context, wsID, wsName string, opts generateOpts) (any, error) {
	switch opts.Kind {
	case "summary":
		return map[string]any{
			"kind":  "summary",
			"title": wsName + " summary",
			"body":  "• The cell is the basic unit of life.\n• Mitochondria produce ATP.\n• Membranes control transport via diffusion and osmosis.",
		}, nil
	case "flashcards":
		n := opts.Count
		if n <= 0 {
			n = 10
		}
		cards := make([]map[string]any, 0, n)
		for i := 0; i < n; i++ {
			cards = append(cards, map[string]any{
				"id": randID("c"), "deckId": "generated",
				"front": fmt.Sprintf("Term %d", i+1), "back": fmt.Sprintf("Definition for term %d.", i+1),
				"known": false, "srs": newSrsMap(),
			})
		}
		return map[string]any{"kind": "flashcards", "cards": cards}, nil
	default:
		quiz, err := a.s.CreateQuiz(ctx, store.Quiz{
			Name: wsName + " quiz", WorkspaceID: wsID, WorkspaceName: wsName,
			Chapters: opts.Chapters, Questions: buildQuestions(opts), Privacy: "private", TimeLimitMin: opts.TimeLimitMin,
		})
		if err != nil {
			return nil, err
		}
		return map[string]any{"kind": "quiz", "quiz": quiz}, nil
	}
}

// newSrsMap returns a fresh FSRS "new" state (due now) matching SrsState in
// src/api/types.ts, for generated flashcard previews.
func newSrsMap() map[string]any {
	return map[string]any{
		"due": time.Now().UTC().Format(time.RFC3339Nano), "stability": 0, "difficulty": 0,
		"elapsed_days": 0, "scheduled_days": 0, "reps": 0, "lapses": 0, "state": 0, "learning_steps": 0,
	}
}

// buildQuestions mirrors the generator in src/mocks/handlers.ts so generated
// quizzes match the QuestionRunner's expected shapes for every type.
func buildQuestions(opts generateOpts) json.RawMessage {
	types := opts.Types
	if len(types) == 0 {
		types = []string{"mcq"}
	}
	levels := opts.cognitiveLevels()
	n := opts.Count
	if n <= 0 {
		n = 5
	}
	arr := make([]map[string]any, 0, n)
	for i := 0; i < n; i++ {
		t := types[i%len(types)]
		lvl := levels[i%len(levels)]
		q := map[string]any{"id": randID("q"), "type": t, "level": lvl, "prompt": fmt.Sprintf("Generated %s question %d?", t, i+1)}
		switch t {
		case "boolean":
			q["correct"] = true
		case "fill", "short":
			q["accepted"] = []string{"answer"}
		case "ordering":
			q["items"] = []string{"First", "Second", "Third"}
		case "matching":
			q["pairs"] = []map[string]string{{"left": "A", "right": "1"}, {"left": "B", "right": "2"}}
		case "multi":
			q["options"] = []string{"A", "B", "C", "D"}
			q["correct"] = []int{0, 2}
		default:
			q["type"] = "mcq"
			q["options"] = []string{"A", "B", "C", "D"}
			q["correct"] = []int{0}
		}
		arr = append(arr, q)
	}
	b, _ := json.Marshal(arr)
	return b
}
