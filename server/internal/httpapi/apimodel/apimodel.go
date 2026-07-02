// Package apimodel holds the HTTP request/response contracts for the gateway,
// kept separate from the persistence models in internal/store. huma reflects
// these types to generate the OpenAPI spec that the frontend consumes.
//
// Arrays that the frontend edits as dynamic free-text rows (react-hook-form's
// useFieldArray rejects primitive arrays) are shaped as objects here — e.g.
// workspace tags are []StrVal on the wire but stay []string in the database.
package apimodel

import (
	"time"

	"github.com/evonotes/server/internal/store"
)

// StrVal wraps a bare string so it can bind to react-hook-form useFieldArray.
type StrVal struct {
	Value string `json:"value"`
}

// WrapStrings turns a []string (DB shape) into the []StrVal wire shape.
func WrapStrings(ss []string) []StrVal {
	out := make([]StrVal, len(ss))
	for i, s := range ss {
		out[i] = StrVal{Value: s}
	}
	return out
}

// UnwrapStrings turns the []StrVal wire shape back into a []string for the DB.
func UnwrapStrings(vs []StrVal) []string {
	out := make([]string, len(vs))
	for i, v := range vs {
		out[i] = v.Value
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
)

// Workspace is the response contract. Tags are object-wrapped for useFieldArray.
type Workspace struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Color          string    `json:"color"`
	Privacy        string    `json:"privacy"`
	Tags           []StrVal  `json:"tags"`
	ChapterCount   int       `json:"chapterCount"`
	FileCount      int       `json:"fileCount"`
	CreatedAt      time.Time `json:"createdAt"`
	LastAccessedAt time.Time `json:"lastAccessedAt"`
}

func FromWorkspace(w store.Workspace) Workspace {
	return Workspace{
		ID: w.ID, Name: w.Name, Color: w.Color, Privacy: w.Privacy,
		Tags: WrapStrings(w.Tags), ChapterCount: w.ChapterCount, FileCount: w.FileCount,
		CreatedAt: w.CreatedAt, LastAccessedAt: w.LastAccessedAt,
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
	Chapters      []string         `json:"chapters"`
	Questions     []map[string]any `json:"questions"`
	CreatedAt     time.Time        `json:"createdAt"`
	Privacy       string           `json:"privacy"`
	TimeLimitMin  *int             `json:"timeLimitMin,omitempty"`
}

func FromQuiz(q store.Quiz) Quiz {
	out := Quiz{
		ID: q.ID, Name: q.Name, WorkspaceID: q.WorkspaceID, WorkspaceName: q.WorkspaceName,
		Chapters: q.Chapters, Questions: decodeQuestions(q.Questions), CreatedAt: q.CreatedAt,
		Privacy: q.Privacy, TimeLimitMin: q.TimeLimitMin,
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

// PublicQuiz is a quiz shared on Explore.
type PublicQuiz struct {
	Quiz
	Author string `json:"author"`
	Clones int    `json:"clones"`
}

func FromPublicQuizzes(qs []store.PublicQuiz) []PublicQuiz {
	out := make([]PublicQuiz, len(qs))
	for i, q := range qs {
		out[i] = PublicQuiz{Quiz: FromQuiz(q.Quiz), Author: q.Author, Clones: q.Clones}
	}
	return out
}
