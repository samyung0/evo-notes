package store

import (
	"encoding/json"
	"time"
)

// JSON tags match src/api/types.ts exactly so responses are drop-in for the
// existing frontend (camelCase, nullable fields as pointers).

type User struct {
	ID                 string             `json:"id"`
	Name               string             `json:"name"`
	Email              string             `json:"email"`
	AvatarURL          string             `json:"avatarUrl,omitempty"`
	ClassLabel         string             `json:"classLabel,omitempty"`
	Streak             int                `json:"streak"`
	PlanTier           PlanTier           `json:"planTier"`
	SubscriptionStatus SubscriptionStatus `json:"subscriptionStatus"`
}

type Workspace struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Color          UserColor `json:"color"`
	Privacy        Privacy   `json:"privacy"`
	Tags           []string  `json:"tags"`
	ChapterCount   int       `json:"chapterCount"`
	FileCount      int       `json:"fileCount"`
	CreatedAt      time.Time `json:"createdAt"`
	LastAccessedAt time.Time `json:"lastAccessedAt"`
}

type Chapter struct {
	ID          string   `json:"id"`
	WorkspaceID string   `json:"workspaceId"`
	Name        string   `json:"name"`
	Order       int      `json:"order"`
	FileIDs     []string `json:"fileIds" nullable:"false"`
}

type File struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspaceId"`
	ChapterID   *string    `json:"chapterId"` // null = unfiled (not omitempty)
	Name        string     `json:"name"`
	Kind        FileKind   `json:"kind"`
	SizeKb      int        `json:"sizeKb"`
	AddedAt     time.Time  `json:"addedAt"`
	Status      FileStatus `json:"status,omitempty"`
	URL         *string    `json:"url,omitempty"`
	Content     *string    `json:"content,omitempty"`
}

type Quiz struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	WorkspaceID   string          `json:"workspaceId"`
	WorkspaceName string          `json:"workspaceName"`
	Chapters      []string        `json:"chapters"`
	Questions     json.RawMessage `json:"questions"`
	CreatedAt     time.Time       `json:"createdAt"`
	Privacy       Privacy         `json:"privacy"`
	TimeLimitMin  *int            `json:"timeLimitMin,omitempty"`
}

type Attempt struct {
	ID            string    `json:"id"`
	QuizID        string    `json:"quizId"`
	QuizName      string    `json:"quizName"`
	WorkspaceName string    `json:"workspaceName"`
	Chapters      []string  `json:"chapters" nullable:"false"`
	Correct       int       `json:"correct"`
	Total         int       `json:"total"`
	Pct           int       `json:"pct"`
	TakenAt       time.Time `json:"takenAt"`
}

// AttemptDetail carries the per-question payload for a single attempt's result
// breakdown. Answers is a map keyed by question id; Questions is the snapshot
// taken at submit time. Both stay opaque JSON (the frontend owns the shapes).
type AttemptDetail struct {
	Attempt
	Answers   json.RawMessage
	Questions json.RawMessage
}

type Deck struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	WorkspaceID   string    `json:"workspaceId"`
	WorkspaceName string    `json:"workspaceName"`
	Color         UserColor `json:"color"`
	CardCount     int       `json:"cardCount"`
	KnownPct      int       `json:"knownPct"`
	DueCount      int       `json:"dueCount"`
}

// Srs is the FSRS scheduling state persisted as jsonb; the shape mirrors
// SrsState in src/api/types.ts (the frontend owns the algorithm).
type Flashcard struct {
	ID     string   `json:"id"`
	DeckID string   `json:"deckId"`
	Front  string   `json:"front"`
	Back   string   `json:"back"`
	Known  bool     `json:"known"`
	Srs    SrsState `json:"srs"`
}

type Label struct {
	ID    string    `json:"id"`
	Name  string    `json:"name"`
	Color UserColor `json:"color"`
}

type Event struct {
	ID       string    `json:"id"`
	Title    string    `json:"title"`
	Start    time.Time `json:"start"`
	End      time.Time `json:"end"`
	LabelIDs []string  `json:"labelIds" nullable:"false"`
	Location *string   `json:"location,omitempty"`
	Note     *string   `json:"note,omitempty"`
}

type Task struct {
	ID      string    `json:"id"`
	Title   string    `json:"title"`
	Meta    *string   `json:"meta,omitempty"`
	Done    bool      `json:"done"`
	DueDate time.Time `json:"dueDate"`
}

type Notification struct {
	ID    string           `json:"id"`
	Kind  NotificationKind `json:"kind"`
	Title string           `json:"title"`
	Body  string           `json:"body"`
	At    time.Time        `json:"at"`
	Read  bool             `json:"read"`
}

type Canvas struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	UpdatedAt time.Time       `json:"updatedAt"`
	Scene     json.RawMessage `json:"scene,omitempty"`
}

type SearchResult struct {
	ID       string     `json:"id"`
	Kind     SearchKind `json:"kind"`
	Title    string     `json:"title"`
	Subtitle string     `json:"subtitle,omitempty"`
	Href     string     `json:"href"`
}

type PublicWorkspace struct {
	Workspace
	Author string `json:"author"`
	Clones int    `json:"clones"`
}

type PublicQuiz struct {
	Quiz
	Author string `json:"author"`
	Clones int    `json:"clones"`
}

type WorkspaceStats struct {
	Chapters int `json:"chapters"`
	Files    int `json:"files"`
	Quizzes  int `json:"quizzes"`
	Attempts int `json:"attempts"`
	AvgScore int `json:"avgScore"`
}
