package store

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"

	"github.com/evonotes/server/internal/materialdoc"
)

func equalJSONDocuments(a, b string) bool {
	var left, right any
	if json.Unmarshal([]byte(a), &left) != nil || json.Unmarshal([]byte(b), &right) != nil {
		return false
	}
	return reflect.DeepEqual(left, right)
}

func createSharingTestWorkspace(t *testing.T, s *Store, shareRole ShareRole) (context.Context, Workspace) {
	t.Helper()
	ctx := context.Background()
	ws, err := s.CreateWorkspace(
		ctx,
		"u_owner",
		"Sharing test "+uid("name"),
		ColorGraphite,
		[]TagRef{},
	)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.DeleteWorkspace(ctx, "u_owner", ws.ID) })
	privacy := PrivacyLink
	if shareRole == "" {
		shareRole = ShareViewer
	}
	ws, err = s.UpdateWorkspaceSharing(ctx, "u_owner", ws.ID, &privacy, &shareRole)
	if err != nil {
		t.Fatal(err)
	}
	return ctx, ws
}

func TestWorkspaceDefaultsToInviteOnlyViewer(t *testing.T) {
	s := openAccessTestStore(t)
	ctx := context.Background()
	ws, err := s.CreateWorkspace(ctx, "u_owner", "Default test "+uid("name"), ColorGraphite, []TagRef{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.DeleteWorkspace(ctx, "u_owner", ws.ID) })
	if ws.Privacy != PrivacyPrivate || ws.ShareRole != ShareViewer {
		t.Fatalf("default sharing = privacy %q, role %q; want private/viewer", ws.Privacy, ws.ShareRole)
	}
}

func TestEffectiveMaterialAccessAndMemberPrecedence(t *testing.T) {
	s := openAccessTestStore(t)
	ctx, ws := createSharingTestWorkspace(t, s, ShareEditor)

	content, err := materialdoc.Marshal(materialdoc.Empty())
	if err != nil {
		t.Fatal(err)
	}
	material, err := s.CreateMaterial(ctx, Material{
		WorkspaceID: ws.ID, WorkspaceName: ws.Name, Kind: "note", Title: "Shared note",
		Content: content, Privacy: PrivacyPrivate,
	})
	if err != nil {
		t.Fatal(err)
	}

	access, err := s.MaterialEffectiveAccess(ctx, "u_other", material.ID)
	if err != nil || access.Role != RoleEditor || access.Explicit {
		t.Fatalf("signed-in nonmember access = %#v, %v", access, err)
	}
	anonymous, err := s.MaterialEffectiveAccess(ctx, "", material.ID)
	if err != nil || anonymous.Role != RoleViewer || anonymous.Explicit {
		t.Fatalf("anonymous access = %#v, %v", anonymous, err)
	}
	if err := s.AssertWorkspaceEditor(ctx, "u_other", ws.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("share editor gained structural workspace access: %v", err)
	}

	if _, err := s.pool.Exec(ctx, `INSERT INTO workspace_members (workspace_id,user_id,role)
		VALUES ($1,$2,'viewer')`, ws.ID, "u_other"); err != nil {
		t.Fatal(err)
	}
	access, err = s.MaterialEffectiveAccess(ctx, "u_other", material.ID)
	if err != nil || access.Role != RoleViewer || !access.Explicit {
		t.Fatalf("explicit viewer did not override share editor: %#v, %v", access, err)
	}

	standalone, err := s.CreateMaterial(ctx, Material{
		UserID: "u_owner", Kind: "note", Title: "Standalone link",
		Content: content, Privacy: PrivacyLink,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.DeleteMaterial(ctx, standalone.ID) })
	access, err = s.MaterialEffectiveAccess(ctx, "u_other", standalone.ID)
	if err != nil || access.Role != RoleViewer || access.Explicit {
		t.Fatalf("standalone sharing must remain view-only: %#v, %v", access, err)
	}
}

func TestIdentityBoundInviteSearchAndAcceptance(t *testing.T) {
	s := openAccessTestStore(t)
	ctx, ws := createSharingTestWorkspace(t, s, ShareViewer)

	var otherEmail string
	if err := s.pool.QueryRow(ctx, `SELECT email FROM users WHERE id='u_other'`).Scan(&otherEmail); err != nil {
		t.Fatal(err)
	}
	candidates, err := s.SearchWorkspaceInviteCandidates(ctx, ws.ID, otherEmail)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, candidate := range candidates {
		found = found || candidate.ID == "u_other"
		if candidate.ID == "u_owner" {
			t.Fatal("owner was returned as an invite candidate")
		}
	}
	if !found {
		t.Fatalf("u_other was not returned for %q: %#v", otherEmail, candidates)
	}

	invite, err := s.CreateWorkspaceInvite(ctx, ws.ID, "u_other", RoleCommenter, "u_owner")
	if err != nil {
		t.Fatal(err)
	}
	if invite.InvitedUserID != "u_other" || !strings.EqualFold(invite.Email, otherEmail) || invite.Token == "" {
		t.Fatalf("identity-bound invite is incomplete: %#v", invite)
	}
	candidates, err = s.SearchWorkspaceInviteCandidates(ctx, ws.ID, otherEmail)
	if err != nil {
		t.Fatal(err)
	}
	for _, candidate := range candidates {
		if candidate.ID == "u_other" {
			t.Fatal("pending invite recipient remained a candidate")
		}
	}

	if _, err := s.AcceptWorkspaceInvite(ctx, invite.Token, "u_viewer"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("mismatched user accepted bound invite: %v", err)
	}
	member, err := s.AcceptWorkspaceInvite(ctx, invite.Token, "u_other")
	if err != nil {
		t.Fatal(err)
	}
	if member.UserID != "u_other" || member.Role != RoleCommenter {
		t.Fatalf("accepted member = %#v", member)
	}
}

func TestAtomicSuggestionAcceptance(t *testing.T) {
	s := openAccessTestStore(t)
	ctx, ws := createSharingTestWorkspace(t, s, ShareViewer)

	initial, err := materialdoc.Marshal(materialdoc.Empty())
	if err != nil {
		t.Fatal(err)
	}
	material, err := s.CreateMaterial(ctx, Material{
		WorkspaceID: ws.ID, WorkspaceName: ws.Name, Kind: "note", Title: "Suggested note",
		Content: initial, Privacy: PrivacyPrivate,
	})
	if err != nil {
		t.Fatal(err)
	}
	fragment, err := json.Marshal(materialdoc.Empty().Value)
	if err != nil {
		t.Fatal(err)
	}
	suggestion, err := s.CreateMaterialSuggestion(ctx, MaterialSuggestion{
		MaterialID: material.ID, UserID: "u_other", BaseRevision: 1,
		Anchor: json.RawMessage(`{}`), OriginalFragment: fragment, ProposedFragment: fragment,
	})
	if err != nil {
		t.Fatal(err)
	}

	finalizedDoc := materialdoc.Empty()
	finalizedDoc.Value[0]["children"] = []any{map[string]any{"text": "accepted"}}
	finalized, err := materialdoc.Marshal(finalizedDoc)
	if err != nil {
		t.Fatal(err)
	}
	accepted, err := s.AcceptMaterialSuggestion(ctx, suggestion.ID, "u_owner", finalized, 1)
	if err != nil {
		t.Fatal(err)
	}
	if accepted.Status != SuggestionAccepted {
		t.Fatalf("suggestion status = %q", accepted.Status)
	}
	updated, err := s.GetMaterial(ctx, material.ID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Revision != 2 || !equalJSONDocuments(updated.Content, finalized) {
		t.Fatalf("material was not atomically finalized: revision=%d content=%s", updated.Revision, updated.Content)
	}

	stale, err := s.CreateMaterialSuggestion(ctx, MaterialSuggestion{
		MaterialID: material.ID, UserID: "u_other", BaseRevision: 2,
		Anchor: json.RawMessage(`{}`), OriginalFragment: fragment, ProposedFragment: fragment,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.AcceptMaterialSuggestion(ctx, stale.ID, "u_owner", initial, 1); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale acceptance error = %v", err)
	}
	afterConflict, err := s.GetMaterialSuggestion(ctx, stale.ID)
	if err != nil {
		t.Fatal(err)
	}
	unchanged, err := s.GetMaterial(ctx, material.ID)
	if err != nil {
		t.Fatal(err)
	}
	if afterConflict.Status != SuggestionPending ||
		unchanged.Revision != 2 ||
		!equalJSONDocuments(unchanged.Content, finalized) {
		t.Fatalf("stale acceptance left partial state: suggestion=%q material=%d", afterConflict.Status, unchanged.Revision)
	}
}
