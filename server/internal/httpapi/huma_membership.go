package httpapi

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/evonotes/server/internal/httpapi/apimodel"
	"github.com/evonotes/server/internal/materialdoc"
	"github.com/evonotes/server/internal/store"
)

type workspaceMembersOutput struct{ Body []apimodel.WorkspaceMember }
type workspaceInvitesOutput struct{ Body []apimodel.WorkspaceInvite }
type workspaceInviteCandidatesOutput struct {
	Body []apimodel.WorkspaceInviteCandidate
}
type workspaceInviteOutput struct {
	Body apimodel.CreatedWorkspaceInvite
}
type workspaceMemberOutput struct{ Body apimodel.WorkspaceMember }

type createWorkspaceInviteInput struct {
	ID   string `path:"id"`
	Body apimodel.CreateWorkspaceInviteReq
}
type workspaceInviteCandidatesInput struct {
	ID string `path:"id"`
	Q  string `query:"q" minLength:"1"`
}
type workspaceInviteInput struct {
	ID       string `path:"id"`
	InviteID string `path:"inviteId"`
}
type acceptWorkspaceInviteInput struct {
	Token string `path:"token"`
}
type workspaceMemberInput struct {
	ID       string `path:"id"`
	MemberID string `path:"memberId"`
}
type updateWorkspaceMemberInput struct {
	ID       string `path:"id"`
	MemberID string `path:"memberId"`
	Body     apimodel.UpdateWorkspaceMemberReq
}

func (a *api) registerMembership(api huma.API) {
	const tag = "Workspace collaboration"
	reg(api, http.MethodGet, "/api/workspaces/{id}/members", "listWorkspaceMembers", tag, "List workspace members", http.StatusOK, a.listWorkspaceMembers)
	reg(api, http.MethodPatch, "/api/workspaces/{id}/members/{memberId}", "updateWorkspaceMember", tag, "Change a workspace member role", http.StatusNoContent, a.updateWorkspaceMember)
	reg(api, http.MethodDelete, "/api/workspaces/{id}/members/{memberId}", "removeWorkspaceMember", tag, "Remove a workspace member", http.StatusNoContent, a.removeWorkspaceMember)
	reg(api, http.MethodGet, "/api/workspaces/{id}/invites", "listWorkspaceInvites", tag, "List workspace invites", http.StatusOK, a.listWorkspaceInvites)
	reg(api, http.MethodGet, "/api/workspaces/{id}/invite-candidates", "searchWorkspaceInviteCandidates", tag, "Search users eligible for a workspace invitation", http.StatusOK, a.searchWorkspaceInviteCandidates)
	reg(api, http.MethodPost, "/api/workspaces/{id}/invites", "createWorkspaceInvite", tag, "Invite a workspace member", http.StatusCreated, a.createWorkspaceInvite)
	reg(api, http.MethodDelete, "/api/workspaces/{id}/invites/{inviteId}", "revokeWorkspaceInvite", tag, "Revoke a workspace invite", http.StatusNoContent, a.revokeWorkspaceInvite)
	reg(api, http.MethodPost, "/api/workspace-invites/{token}/accept", "acceptWorkspaceInvite", tag, "Accept a workspace invite", http.StatusOK, a.acceptWorkspaceInvite)
}

func collaborationError(err error) error {
	if errors.Is(err, store.ErrForbidden) {
		return huma.Error403Forbidden("insufficient workspace role")
	}
	if errors.Is(err, store.ErrConflict) {
		return huma.Error409Conflict("material revision is stale")
	}
	if errors.Is(err, materialdoc.ErrInvalid) {
		return huma.Error400BadRequest(err.Error())
	}
	return hErr(err)
}

func (a *api) listWorkspaceMembers(ctx context.Context, in *workspaceIDInput) (*workspaceMembersOutput, error) {
	role, err := a.s.WorkspaceRole(ctx, userID(ctx), in.ID)
	if err != nil || role == "" {
		if err == nil {
			err = store.ErrForbidden
		}
		return nil, collaborationError(err)
	}
	members, err := a.s.ListWorkspaceMembers(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	return &workspaceMembersOutput{Body: members}, nil
}

func (a *api) searchWorkspaceInviteCandidates(
	ctx context.Context,
	in *workspaceInviteCandidatesInput,
) (*workspaceInviteCandidatesOutput, error) {
	if err := a.s.AssertWorkspaceOwner(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	candidates, err := a.s.SearchWorkspaceInviteCandidates(ctx, in.ID, in.Q)
	if err != nil {
		return nil, collaborationError(err)
	}
	return &workspaceInviteCandidatesOutput{Body: candidates}, nil
}

func (a *api) createWorkspaceInvite(ctx context.Context, in *createWorkspaceInviteInput) (*workspaceInviteOutput, error) {
	if err := a.s.AssertWorkspaceOwner(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	invite, err := a.s.CreateWorkspaceInvite(ctx, in.ID, in.Body.UserID, in.Body.Role, userID(ctx))
	if err != nil {
		return nil, collaborationError(err)
	}
	return &workspaceInviteOutput{Body: apimodel.FromCreatedWorkspaceInvite(invite)}, nil
}

func (a *api) listWorkspaceInvites(ctx context.Context, in *workspaceIDInput) (*workspaceInvitesOutput, error) {
	if err := a.s.AssertWorkspaceOwner(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	invites, err := a.s.ListWorkspaceInvites(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	return &workspaceInvitesOutput{Body: apimodel.FromWorkspaceInvites(invites)}, nil
}

func (a *api) revokeWorkspaceInvite(ctx context.Context, in *workspaceInviteInput) (*Empty, error) {
	if err := a.s.AssertWorkspaceOwner(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.RevokeWorkspaceInvite(ctx, in.ID, in.InviteID); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}

func (a *api) acceptWorkspaceInvite(ctx context.Context, in *acceptWorkspaceInviteInput) (*workspaceMemberOutput, error) {
	member, err := a.s.AcceptWorkspaceInvite(ctx, in.Token, userID(ctx))
	if err != nil {
		return nil, collaborationError(err)
	}
	return &workspaceMemberOutput{Body: member}, nil
}

func (a *api) updateWorkspaceMember(ctx context.Context, in *updateWorkspaceMemberInput) (*Empty, error) {
	if err := a.s.AssertWorkspaceOwner(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.SetWorkspaceMemberRole(ctx, in.ID, in.MemberID, in.Body.Role); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}

func (a *api) removeWorkspaceMember(ctx context.Context, in *workspaceMemberInput) (*Empty, error) {
	if err := a.s.AssertWorkspaceOwner(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.RemoveWorkspaceMember(ctx, in.ID, in.MemberID); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}
