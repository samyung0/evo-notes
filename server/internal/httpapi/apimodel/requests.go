package apimodel

import (
	"encoding/json"
	"time"
)

/* ------------------------------------------------------------------ requests */

// CreateWorkspaceReq is the body for POST /api/workspaces. Name and privacy are
// required (todo #8); color and tags fall back to server defaults.
type CreateWorkspaceReq struct {
	Name    string   `json:"name" minLength:"1" maxLength:"100" doc:"Workspace name"`
	Color   string   `json:"color,omitempty" doc:"User color; defaults to green"`
	Privacy string   `json:"privacy" enum:"private,public,link" doc:"Visibility"`
	Tags    []StrVal `json:"tags,omitempty" doc:"Free-text tags"`
}

// UpdateWorkspaceReq is the (partial) body for PATCH /api/workspaces/{id}.
type UpdateWorkspaceReq struct {
	Name    *string   `json:"name,omitempty"`
	Color   *string   `json:"color,omitempty"`
	Privacy *string   `json:"privacy,omitempty" enum:"private,public,link"`
	Tags    *[]StrVal `json:"tags,omitempty"`
}

type AddChapterReq struct {
	Name string `json:"name" minLength:"1" doc:"Chapter name"`
}

type UpdateChapterReq struct {
	Name  *string `json:"name,omitempty"`
	Order *int    `json:"order,omitempty"`
}

type ReorderChaptersReq struct {
	IDs []string `json:"ids" doc:"Chapter ids in the desired order"`
}

type CreateQuizReq struct {
	Name         string           `json:"name,omitempty"`
	WorkspaceID  string           `json:"workspaceId,omitempty"`
	Chapters     []string         `json:"chapters,omitempty"`
	Questions    []map[string]any `json:"questions,omitempty"`
	Privacy      string           `json:"privacy,omitempty" enum:"private,public,link"`
	TimeLimitMin *int             `json:"timeLimitMin,omitempty"`
}

type UpdateQuizReq struct {
	Name         *string           `json:"name,omitempty"`
	Chapters     *[]string         `json:"chapters,omitempty"`
	Questions    *[]map[string]any `json:"questions,omitempty"`
	Privacy      *string           `json:"privacy,omitempty" enum:"private,public,link"`
	TimeLimitMin *int              `json:"timeLimitMin,omitempty"`
}

type CreateAttemptReq struct {
	Correct int              `json:"correct"`
	Total   int              `json:"total"`
	Wrong   []map[string]any `json:"wrong,omitempty" doc:"Questions answered incorrectly"`
}

type CreateDeckReq struct {
	Name        string `json:"name,omitempty"`
	Color       string `json:"color,omitempty"`
	WorkspaceID string `json:"workspaceId,omitempty"`
}

type CreateCardReq struct {
	Front string `json:"front,omitempty"`
	Back  string `json:"back,omitempty"`
}

type UpdateCardReq struct {
	Front *string         `json:"front,omitempty"`
	Back  *string         `json:"back,omitempty"`
	Known *bool           `json:"known,omitempty"`
	Srs   *map[string]any `json:"srs,omitempty"`
}

type CreateEventReq struct {
	Title    string    `json:"title" minLength:"1"`
	Start    time.Time `json:"start"`
	End      time.Time `json:"end"`
	LabelIDs []string  `json:"labelIds,omitempty"`
	Location *string   `json:"location,omitempty"`
	Note     *string   `json:"note,omitempty"`
}

type UpdateEventReq struct {
	Title    *string    `json:"title,omitempty"`
	Start    *time.Time `json:"start,omitempty"`
	End      *time.Time `json:"end,omitempty"`
	LabelIDs *[]string  `json:"labelIds,omitempty"`
	Location *string    `json:"location,omitempty"`
	Note     *string    `json:"note,omitempty"`
}

type UpdateTaskReq struct {
	Title *string `json:"title,omitempty"`
	Meta  *string `json:"meta,omitempty"`
	Done  *bool   `json:"done,omitempty"`
}

type CreateCanvasReq struct {
	Name string `json:"name,omitempty"`
}

type SaveCanvasReq struct {
	Name  *string `json:"name,omitempty"`
	Scene any     `json:"scene,omitempty"`
}

type BillingCheckoutReq struct {
	PlanTier string `json:"planTier" enum:"pro,team"`
}

/* --------------------------------------------------------- small responses */

// URLResp is returned by billing checkout/portal (a redirect target).
type URLResp struct {
	URL string `json:"url"`
}

// AccessTokenResp is returned by the Google picker-token endpoint.
type AccessTokenResp struct {
	AccessToken string `json:"accessToken"`
}

// RecentFile is a lightweight file reference from an external provider.
type RecentFile struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

/* ------------------------------------------------------------------ helpers */

// decodeQuestions turns stored question JSON into a free-form array for output.
func decodeQuestions(raw []byte) []map[string]any {
	out := []map[string]any{}
	if len(raw) == 0 {
		return out
	}
	_ = json.Unmarshal(raw, &out)
	if out == nil {
		out = []map[string]any{}
	}
	return out
}

// EncodeQuestions marshals a free-form question array back to storage bytes.
func EncodeQuestions(qs []map[string]any) json.RawMessage {
	if qs == nil {
		return json.RawMessage("[]")
	}
	b, err := json.Marshal(qs)
	if err != nil {
		return json.RawMessage("[]")
	}
	return b
}

// EncodeRaw marshals any value to json.RawMessage (used for scene/srs/wrong).
func EncodeRaw(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	return b
}
