package httpapi

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/evonotes/server/internal/httpapi/apimodel"
	"github.com/evonotes/server/internal/materialdoc"
	"github.com/evonotes/server/internal/store"
)

func TestCollaborationContractsAreRegistered(t *testing.T) {
	spec, err := SpecYAML()
	if err != nil {
		t.Fatal(err)
	}
	text := string(spec)
	for _, expected := range []string{
		"/api/workspaces/{id}/members:",
		"/api/workspaces/{id}/invite-candidates:",
		"/api/workspace-invites/{token}/accept:",
		"/api/materials/{id}/revisions:",
		"/api/materials/{id}/suggestions:",
		"/api/material-suggestions/{id}:",
		"/api/materials/{id}/discussions:",
		"/api/discussions/{id}/comments:",
		"expectedRevision:",
		"expectedBaseRevision:",
		"finalizedContent:",
		"shareRole:",
		"invitedUserId:",
		"schemaVersion:",
		"capabilities:",
		"originalFragment:",
		"proposedFragment:",
	} {
		if !strings.Contains(text, expected) {
			t.Errorf("OpenAPI contract missing %q", expected)
		}
	}
}

func TestSharedMaterialPatchAllowList(t *testing.T) {
	content := materialdoc.Empty()
	revision := int64(3)
	if !sharedMaterialPatchAllowed(apimodel.UpdateMaterialReq{
		Content: &content, ExpectedRevision: &revision,
	}) {
		t.Fatal("content-only optimistic patch should be allowed")
	}
	title := "renamed"
	chapter := "ch_1"
	scope := []string{"ch_1"}
	privacy := store.PrivacyPublic
	for name, body := range map[string]apimodel.UpdateMaterialReq{
		"missing content":  {ExpectedRevision: &revision},
		"missing revision": {Content: &content},
		"title":            {Content: &content, ExpectedRevision: &revision, Title: &title},
		"chapter":          {Content: &content, ExpectedRevision: &revision, ChapterID: &chapter},
		"scope":            {Content: &content, ExpectedRevision: &revision, ScopeChapters: &scope},
		"privacy":          {Content: &content, ExpectedRevision: &revision, Privacy: &privacy},
	} {
		t.Run(name, func(t *testing.T) {
			if sharedMaterialPatchAllowed(body) {
				t.Fatalf("shared editor patch unexpectedly allowed: %#v", body)
			}
		})
	}
}

func TestMaterialResponseIncludesDecodedContent(t *testing.T) {
	raw, err := materialdoc.Marshal(materialdoc.Empty())
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(apimodel.FromMaterial(store.Material{
		ID: "mat_1", Kind: "note", Content: raw,
		ScopeChapters: []string{}, ScopeFileIDs: []string{},
	}))
	if err != nil {
		t.Fatal(err)
	}
	var body map[string]any
	if err := json.Unmarshal(encoded, &body); err != nil {
		t.Fatal(err)
	}
	content, ok := body["content"].(map[string]any)
	if !ok || content["schemaVersion"] != float64(1) {
		t.Fatalf("material response omitted decoded content: %s", encoded)
	}
}

func TestInviteListContractNeverSerializesBearerToken(t *testing.T) {
	invite := store.WorkspaceInvite{ID: "inv_1", Token: "raw-secret"}
	listed, err := json.Marshal(apimodel.FromWorkspaceInvite(invite))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(listed), "raw-secret") || strings.Contains(string(listed), `"token"`) {
		t.Fatalf("listed invite exposed its bearer token: %s", listed)
	}

	created, err := json.Marshal(apimodel.FromCreatedWorkspaceInvite(invite))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(created), `"token":"raw-secret"`) {
		t.Fatalf("create response omitted its one-time token: %s", created)
	}
}

func TestWorkspaceAccessMetadataDistinguishesEditorsAndPublicViewers(t *testing.T) {
	editor := apimodel.FromWorkspaceAccess(store.Workspace{ID: "ws_1"}, store.RoleEditor)
	if editor.IsOwner || editor.Role == nil || *editor.Role != store.RoleEditor ||
		!editor.Capabilities.CanEdit || !editor.Capabilities.CanComment {
		t.Fatalf("editor access metadata is incorrect: %#v", editor)
	}

	public := apimodel.FromWorkspaceAccess(store.Workspace{ID: "ws_2"}, "")
	if public.IsOwner || public.Role != nil || !public.Capabilities.CanView ||
		public.Capabilities.CanEdit || public.Capabilities.CanComment {
		t.Fatalf("public viewer access metadata is incorrect: %#v", public)
	}
}
