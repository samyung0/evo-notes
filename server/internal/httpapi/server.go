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

	"github.com/danielgtaylor/huma/v2/adapters/humachi"
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

// New builds the full HTTP handler. huma owns every JSON operation (and the
// live OpenAPI spec at /openapi.yaml + docs at /docs); a handful of endpoints
// huma can't model — streaming SSE, multipart upload, blob download redirects,
// webhooks, and the pipeline chat/generate passthrough — stay on raw chi and
// are intentionally absent from the spec.
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

	// Mount huma on the chi router. Doc/spec routes register at construction, so
	// this must come after all r.Use(...) calls.
	humaAPI := humachi.New(r, humaConfig())
	registerRoutes(humaAPI, a)

	// Raw (OpenAPI-excluded) routes.
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	r.Post("/webhooks/clerk", a.clerkWebhook)
	r.Post("/webhooks/stripe", a.stripeWebhook)
	r.Get("/api/integrations/google/callback", a.googleCallback)
	r.Get("/api/integrations/microsoft/callback", a.microsoftCallback)
	r.Get("/api/integrations/google/connect", a.googleConnect)
	r.Get("/api/integrations/microsoft/connect", a.microsoftConnect)
	r.Post("/api/workspaces/{id}/sources", a.addSource)
	r.Post("/api/workspaces/{id}/sources/import", a.importSources)
	r.Get("/api/workspaces/{id}/ingest-events", a.ingestEvents)
	r.Post("/api/workspaces/{id}/chat", a.chat)
	r.Post("/api/workspaces/{id}/chat/stream", a.chatStream)
	r.Post("/api/workspaces/{id}/complete/stream", a.completeStream)
	r.Post("/api/workspaces/{id}/ai/command", a.aiCommand)
	r.Post("/api/workspaces/{id}/generate", a.generate)
	r.Post("/api/transcribe", a.transcribe)
	r.Get("/api/files/{id}/raw", a.getFileRaw)

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

func decode(r *http.Request, v any) error { return json.NewDecoder(r.Body).Decode(v) }

func (a *api) fail(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"message": "not found"})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
}

func id(r *http.Request) string { return chi.URLParam(r, "id") }

func uid(r *http.Request) string { return auth.UserID(r.Context()) }

func randID(prefix string) string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func randInt(min, max int) int {
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(max-min)))
	return min + int(n.Int64())
}

func (a *api) assertWS(w http.ResponseWriter, r *http.Request, wsID string) bool {
	if err := a.s.AssertWorkspaceOwner(r.Context(), uid(r), wsID); err != nil {
		a.fail(w, err)
		return false
	}
	return true
}

/* ------------------------------------------------------ raw source handlers */

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

/* -------------------------------------------------------------- chat/generate

   Phase 1 placeholders: shapes match the frontend (ChatMessage / generate
   payloads) so the UI works end-to-end. Phase 3 replaces these with calls to
   the Python retrieval service. Kept on raw chi because the pipeline path is a
   passthrough of arbitrary JSON and generate is polymorphic. */

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
	Levels       []string `json:"levels"`     // cognitive levels: recall|application|analysis
	Difficulty   []string `json:"difficulty"` // legacy alias, still accepted
	Chapters     []string `json:"chapters"`
	FileIds      []string `json:"fileIds"`     // file-scoped retrieval filtering
	Detail       string   `json:"detail"`      // mindmap: brief|standard|detailed
	DiagramType  string   `json:"diagramType"` // diagram: auto|flowchart|sequence|class|state|er
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

	userID := uid(r)
	if a.pipe != nil {
		if payload, ok := a.generateViaPipe(r.Context(), userID, wsID, wsName, &opts); ok {
			writeJSON(w, 200, payload)
			return
		}
	}
	payload, err := a.generateLocal(r.Context(), userID, wsID, wsName, opts)
	if err != nil {
		a.fail(w, err)
		return
	}
	writeJSON(w, 200, payload)
}

// resolveScopeFileIDs turns the requested scope into a concrete set of file ids
// for true retrieval filtering. Chapters arrive as names (brittle across rename,
// but that's what the UI sends), so we map them to their file ids via the
// chapter records and union with any explicitly selected file ids. An empty
// result means "whole workspace" (no filtering).
func (a *api) resolveScopeFileIDs(ctx context.Context, wsID string, opts *generateOpts) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(opts.FileIds))
	add := func(id string) {
		if id == "" {
			return
		}
		if _, ok := seen[id]; ok {
			return
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	for _, id := range opts.FileIds {
		add(id)
	}
	if len(opts.Chapters) > 0 {
		want := map[string]struct{}{}
		for _, name := range opts.Chapters {
			want[name] = struct{}{}
		}
		if chapters, err := a.s.ListChapters(ctx, wsID); err == nil {
			for _, ch := range chapters {
				if _, ok := want[ch.Name]; !ok {
					continue
				}
				for _, fid := range ch.FileIDs {
					add(fid)
				}
			}
		}
	}
	return out
}

// generateViaPipe asks the retrieval service to produce grounded output, then
// persists it (quiz -> quizzes, flashcards -> deck+cards, mindmap/diagram ->
// materials) so every artifact shows up in the workspace materials list.
func (a *api) generateViaPipe(ctx context.Context, userID, wsID, wsName string, opts *generateOpts) (any, bool) {
	body := map[string]any{
		"workspaceId": wsID, "kind": opts.Kind, "length": opts.Length, "format": opts.Format,
		"count": opts.Count, "style": opts.Style, "types": opts.Types, "levels": opts.cognitiveLevels(),
		"chapters": opts.Chapters, "fileIds": a.resolveScopeFileIDs(ctx, wsID, opts),
		"detail": opts.Detail, "diagramType": opts.DiagramType, "timeLimitMin": opts.TimeLimitMin,
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
	switch head.Kind {
	case "quiz":
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
	case "flashcards":
		var fp struct {
			Cards []struct {
				Front string `json:"front"`
				Back  string `json:"back"`
			} `json:"cards"`
		}
		_ = json.Unmarshal(raw, &fp)
		fronts := make([][2]string, 0, len(fp.Cards))
		for _, c := range fp.Cards {
			fronts = append(fronts, [2]string{c.Front, c.Back})
		}
		res, err := a.persistDeck(ctx, userID, wsID, wsName, fronts)
		if err != nil {
			return nil, false
		}
		return res, true
	case "mindmap", "diagram":
		var mp struct {
			Title   string `json:"title"`
			Content string `json:"content"`
		}
		_ = json.Unmarshal(raw, &mp)
		res, err := a.persistMaterial(ctx, wsID, wsName, head.Kind, mp.Title, mp.Content, opts)
		if err != nil {
			return nil, false
		}
		return res, true
	}
	var m map[string]any
	if json.Unmarshal(raw, &m) != nil {
		return nil, false
	}
	return m, true
}

// generateLocal is the offline fallback (and the mock-parity generator).
func (a *api) generateLocal(ctx context.Context, userID, wsID, wsName string, opts generateOpts) (any, error) {
	switch opts.Kind {
	case "flashcards":
		n := opts.Count
		if n <= 0 {
			n = 10
		}
		cards := make([][2]string, 0, n)
		for i := 0; i < n; i++ {
			cards = append(cards, [2]string{fmt.Sprintf("Term %d", i+1), fmt.Sprintf("Definition for term %d.", i+1)})
		}
		return a.persistDeck(ctx, userID, wsID, wsName, cards)
	case "mindmap", "diagram":
		return a.persistMaterial(ctx, wsID, wsName, opts.Kind, "", localMaterialContent(wsName, opts), &opts)
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

// persistDeck creates a real deck + cards so generated flashcards appear in the
// library and the workspace materials list.
func (a *api) persistDeck(ctx context.Context, userID, wsID, wsName string, cards [][2]string) (any, error) {
	deck, err := a.s.CreateDeck(ctx, userID, wsName+" flashcards", "green", wsID)
	if err != nil {
		return nil, err
	}
	out := make([]store.Flashcard, 0, len(cards))
	for _, c := range cards {
		card, err := a.s.CreateCard(ctx, deck.ID, c[0], c[1])
		if err != nil {
			return nil, err
		}
		out = append(out, card)
	}
	deck, _ = a.s.GetDeck(ctx, deck.ID)
	return map[string]any{"kind": "flashcards", "deck": deck, "cards": out}, nil
}

// persistMaterial stores a generated mindmap/diagram markdown document.
func (a *api) persistMaterial(ctx context.Context, wsID, wsName, kind, title, content string, opts *generateOpts) (any, error) {
	if title == "" {
		title = wsName + " " + kind
	}
	if content == "" {
		content = localMaterialContent(wsName, *opts)
	}
	mt, err := a.s.CreateMaterial(ctx, store.Material{
		WorkspaceID: wsID, WorkspaceName: wsName, Kind: kind, Title: title, Content: content,
		ScopeChapters: opts.Chapters, ScopeFileIDs: opts.FileIds, Privacy: "private",
	})
	if err != nil {
		return nil, err
	}
	return map[string]any{"kind": kind, "material": mt}, nil
}

// localMaterialContent is the offline mermaid document for mindmaps/diagrams.
func localMaterialContent(wsName string, opts generateOpts) string {
	if opts.Kind == "mindmap" {
		return "# " + wsName + " mindmap\n\n```mermaid\nmindmap\n  root((Topic))\n    Key idea A\n      Detail 1\n      Detail 2\n    Key idea B\n      Detail 3\n```"
	}
	return "# " + wsName + " diagram\n\n```mermaid\nflowchart LR\n  A[Start] --> B[Process]\n  B --> C{Decision}\n  C -->|Yes| D[Outcome 1]\n  C -->|No| E[Outcome 2]\n```"
}

// buildQuestions mirrors the generator in src/mocks/handlers.ts so generated
// quizzes match the QuestionRunner's expected shapes for every type. Free-text
// arrays (options/accepted/items) are object-wrapped ({value}) so the frontend
// can bind them with react-hook-form useFieldArray.
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
			q["explanation"] = "This statement is true based on your sources."
		case "fill", "short":
			q["accepted"] = wrapValues("answer")
			q["explanation"] = "The accepted answer follows from the source material."
		case "ordering":
			q["items"] = wrapValues("First", "Second", "Third")
		case "matching":
			q["pairs"] = []map[string]string{{"left": "A", "right": "1"}, {"left": "B", "right": "2"}}
		case "multi":
			q["options"] = wrapOptions(
				[2]string{"A", "Correct — supported by the material."},
				[2]string{"B", "Incorrect for this question."},
				[2]string{"C", "Correct — also supported."},
				[2]string{"D", "Incorrect for this question."},
			)
			q["correct"] = []int{0, 2}
		default:
			q["type"] = "mcq"
			q["options"] = wrapOptions(
				[2]string{"A", "Correct — this is the best answer."},
				[2]string{"B", "Incorrect — a common distractor."},
				[2]string{"C", "Incorrect for this question."},
				[2]string{"D", "Incorrect for this question."},
			)
			q["correct"] = []int{0}
		}
		arr = append(arr, q)
	}
	b, _ := json.Marshal(arr)
	return b
}

// wrapValues shapes bare strings as [{value}] for useFieldArray compatibility.
func wrapValues(ss ...string) []map[string]string {
	out := make([]map[string]string, len(ss))
	for i, s := range ss {
		out[i] = map[string]string{"value": s}
	}
	return out
}

// wrapOptions shapes [value, explanation] pairs as [{value, explanation}] so
// mcq/multi options carry per-option explanations (why each is right/wrong).
func wrapOptions(pairs ...[2]string) []map[string]string {
	out := make([]map[string]string, len(pairs))
	for i, p := range pairs {
		out[i] = map[string]string{"value": p[0], "explanation": p[1]}
	}
	return out
}
