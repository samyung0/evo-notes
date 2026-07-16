// Package apimodel holds the HTTP request/response contracts for the gateway,
// kept separate from the persistence models in internal/store. huma reflects
// these types to generate the OpenAPI spec that the frontend consumes.
//
// Arrays that the frontend edits as dynamic rows (react-hook-form's
// useFieldArray rejects primitive arrays) are shaped as objects here — e.g.
// workspace tags are []Tag / []TagInput on the wire, backed by the catalog +
// entity_tags tables in the database.
package apimodel

import (
	"time"

	"github.com/evonotes/server/internal/store"
)

// Tag is the response shape for one tag on an entity: a stable catalog id plus
// its display value. Clients echo the id back on the next write so the backend
// reuses that catalog row (preserving its metadata) instead of recreating it.
// The object wrapping (vs a bare string) also lets react-hook-form's
// useFieldArray bind each row.
type Tag struct {
	ID    string `json:"id"`
	Value string `json:"value" minLength:"1" maxLength:"50"`
}

// TagInput is one tag on an incoming write. A non-null ID reuses that existing
// catalog tag; a null/absent ID asks the backend to find-or-create a tag from
// Value.
type TagInput struct {
	ID    *string `json:"id,omitempty"`
	Value string  `json:"value" minLength:"1" maxLength:"50"`
}

// WrapTags turns the DB tag shape into the wire response shape.
func WrapTags(ts []store.Tag) []Tag {
	out := make([]Tag, len(ts))
	for i, t := range ts {
		out[i] = Tag{ID: t.ID, Value: t.Value}
	}
	return out
}

// ToTagRefs turns the incoming wire tags into store refs for a write.
func ToTagRefs(vs []TagInput) []store.TagRef {
	out := make([]store.TagRef, len(vs))
	for i, v := range vs {
		out[i] = store.TagRef{ID: v.ID, Value: v.Value}
	}
	return out
}

/* ------------------------------------------------------------------ responses

   Pass-through contracts: the stored model already has the exact wire shape, so
   we alias it. This keeps every API contract referenced from one package while
   avoiding pointless copy structs. */

type (
	User               = store.User
	Chapter            = store.Chapter
	File               = store.File
	Attempt            = store.Attempt
	Deck               = store.Deck
	Flashcard          = store.Flashcard
	Label              = store.Label
	Event              = store.Event
	Task               = store.Task
	Notification       = store.Notification
	Canvas             = store.Canvas
	SearchResult       = store.SearchResult
	WorkspaceStats     = store.WorkspaceStats
	BillingInfo        = store.BillingInfo
	IntegrationsStatus = store.IntegrationsStatus
	Conversation       = store.Conversation
	Message            = store.Message
	Citation           = store.Citation
	Material           = store.Material
	MaterialRef        = store.MaterialRef
)

// Workspace is the response contract. Tags are object-wrapped for useFieldArray.
// IsOwner is request-scoped: false when a non-owner reads a link/public
// workspace (the client renders it read-only with a clone action).
type Workspace struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Color          store.UserColor `json:"color"`
	Privacy        store.Privacy   `json:"privacy"`
	Tags           []Tag           `json:"tags" nullable:"false"`
	ChapterCount   int             `json:"chapterCount"`
	FileCount      int             `json:"fileCount"`
	CreatedAt      time.Time       `json:"createdAt"`
	LastAccessedAt time.Time       `json:"lastAccessedAt"`
	IsOwner        bool            `json:"isOwner"`
}

func FromWorkspace(w store.Workspace) Workspace {
	return Workspace{
		ID: w.ID, Name: w.Name, Color: w.Color, Privacy: w.Privacy,
		Tags: WrapTags(w.Tags), ChapterCount: w.ChapterCount, FileCount: w.FileCount,
		CreatedAt: w.CreatedAt, LastAccessedAt: w.LastAccessedAt, IsOwner: true,
	}
}

func FromWorkspaces(ws []store.Workspace) []Workspace {
	out := make([]Workspace, len(ws))
	for i, w := range ws {
		out[i] = FromWorkspace(w)
	}
	return out
}

// PublicWorkspace is a workspace shared on Explore.
type PublicWorkspace struct {
	Workspace
	Author string `json:"author"`
	Clones int    `json:"clones"`
}

func FromPublicWorkspaces(ws []store.PublicWorkspace) []PublicWorkspace {
	out := make([]PublicWorkspace, len(ws))
	for i, w := range ws {
		out[i] = PublicWorkspace{Workspace: FromWorkspace(w.Workspace), Author: w.Author, Clones: w.Clones}
	}
	return out
}

// Quiz is the response contract. Questions stay opaque (the frontend owns the
// polymorphic Question union) so we surface them as a free-form array.
type Quiz struct {
	ID            string           `json:"id"`
	Name          string           `json:"name"`
	WorkspaceID   string           `json:"workspaceId"`
	WorkspaceName string           `json:"workspaceName"`
	Chapters      []string         `json:"chapters" nullable:"false"`
	Questions     []map[string]any `json:"questions" nullable:"false"`
	CreatedAt     time.Time        `json:"createdAt"`
	Privacy       store.Privacy    `json:"privacy"`
	TimeLimitMin  *int             `json:"timeLimitMin,omitempty"`
	// IsOwner is request-scoped: false for link/public shared reads.
	IsOwner bool `json:"isOwner"`
}

func FromQuiz(q store.Quiz) Quiz {
	out := Quiz{
		ID: q.ID, Name: q.Name, WorkspaceID: q.WorkspaceID, WorkspaceName: q.WorkspaceName,
		Chapters: q.Chapters, Questions: decodeQuestions(q.Questions), CreatedAt: q.CreatedAt,
		Privacy: q.Privacy, TimeLimitMin: q.TimeLimitMin, IsOwner: true,
	}
	if out.Chapters == nil {
		out.Chapters = []string{}
	}
	return out
}

func FromQuizzes(qs []store.Quiz) []Quiz {
	out := make([]Quiz, len(qs))
	for i, q := range qs {
		out[i] = FromQuiz(q)
	}
	return out
}

// AttemptDetail is the response contract for GET /api/attempts/{id}. Answers
// and Questions stay opaque (the frontend owns the Answer/Question shapes) so
// they are surfaced as free-form JSON, mirroring how Quiz.Questions works.
type AttemptDetail struct {
	store.Attempt
	Answers   map[string]any   `json:"answers" nullable:"false"`
	Questions []map[string]any `json:"questions" nullable:"false"`
}

func FromAttemptDetail(d store.AttemptDetail) AttemptDetail {
	return AttemptDetail{
		Attempt:   d.Attempt,
		Answers:   decodeAnswers(d.Answers),
		Questions: decodeQuestions(d.Questions),
	}
}

// PublicQuiz is a quiz shared on Explore.
type PublicQuiz struct {
	Quiz
	Author string `json:"author"`
	Clones int    `json:"clones"`
}

func FromPublicQuizzes(qs []store.PublicQuiz) []PublicQuiz {
	out := make([]PublicQuiz, len(qs))
	for i, q := range qs {
		pq := PublicQuiz{Quiz: FromQuiz(q.Quiz), Author: q.Author, Clones: q.Clones}
		pq.IsOwner = false
		out[i] = pq
	}
	return out
}

// PublicDeck is a flashcard deck shared on Explore.
type PublicDeck struct {
	store.Deck
	Author string `json:"author"`
	Clones int    `json:"clones"`
}

func FromPublicDecks(ds []store.PublicDeck) []PublicDeck {
	out := make([]PublicDeck, len(ds))
	for i, d := range ds {
		out[i] = PublicDeck{Deck: d.Deck, Author: d.Author, Clones: d.Clones}
	}
	return out
}

// CloneWorkspaceResp reports the cloned workspace and whether the parsed
// LightRAG knowledge base was copied along with it (false = pipeline offline;
// re-ingest files to rebuild the knowledge graph).
type CloneWorkspaceResp struct {
	Workspace Workspace `json:"workspace"`
	RagCloned bool      `json:"ragCloned"`
}
