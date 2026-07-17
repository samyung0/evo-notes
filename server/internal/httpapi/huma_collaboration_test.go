package httpapi

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/evonotes/server/internal/httpapi/apimodel"
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
		"/api/workspace-invites/{token}/accept:",
		"/api/materials/{id}/revisions:",
		"/api/materials/{id}/suggestions:",
		"/api/material-suggestions/{id}:",
		"/api/materials/{id}/discussions:",
		"/api/discussions/{id}/comments:",
		"expectedRevision:",
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
