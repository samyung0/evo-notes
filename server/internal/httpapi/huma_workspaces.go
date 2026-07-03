package httpapi

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/evonotes/server/internal/httpapi/apimodel"
	"github.com/evonotes/server/internal/store"
)

type listWorkspacesInput struct {
	Q     string `query:"q"`
	Sort  string `query:"sort"`
	Color string `query:"color"`
	Tag   string `query:"tag"`
}
type workspacesOutput struct {
	Body []apimodel.Workspace
}
type workspaceOutput struct {
	Body apimodel.Workspace
}
type workspaceIDInput struct {
	ID string `path:"id"`
}
type createWorkspaceInput struct {
	Body apimodel.CreateWorkspaceReq
}
type updateWorkspaceInput struct {
	ID   string `path:"id"`
	Body apimodel.UpdateWorkspaceReq
}
type workspaceStatsOutput struct {
	Body apimodel.WorkspaceStats
}

func (a *api) registerWorkspaces(api huma.API) {
	const tag = "Workspaces"
	reg(api, http.MethodGet, "/api/workspaces", "listWorkspaces", tag, "List workspaces", http.StatusOK, a.listWorkspaces)
	reg(api, http.MethodPost, "/api/workspaces", "createWorkspace", tag, "Create a workspace", http.StatusCreated, a.createWorkspace)
	reg(api, http.MethodGet, "/api/workspaces/{id}", "getWorkspace", tag, "Get a workspace", http.StatusOK, a.getWorkspace)
	reg(api, http.MethodPatch, "/api/workspaces/{id}", "updateWorkspace", tag, "Update a workspace", http.StatusOK, a.updateWorkspace)
	reg(api, http.MethodDelete, "/api/workspaces/{id}", "deleteWorkspace", tag, "Delete a workspace", http.StatusNoContent, a.deleteWorkspace)
	reg(api, http.MethodGet, "/api/workspaces/{id}/stats", "getWorkspaceStats", tag, "Workspace stats", http.StatusOK, a.getWorkspaceStats)
}

func (a *api) listWorkspaces(ctx context.Context, in *listWorkspacesInput) (*workspacesOutput, error) {
	res, err := a.s.ListWorkspaces(ctx, userID(ctx), in.Q, in.Sort, in.Color, in.Tag)
	if err != nil {
		return nil, hErr(err)
	}
	return &workspacesOutput{Body: apimodel.FromWorkspaces(res)}, nil
}

func (a *api) getWorkspace(ctx context.Context, in *workspaceIDInput) (*workspaceOutput, error) {
	res, err := a.s.GetWorkspace(ctx, userID(ctx), in.ID, true)
	if err != nil {
		return nil, hErr(err)
	}
	return &workspaceOutput{Body: apimodel.FromWorkspace(res)}, nil
}

func (a *api) createWorkspace(ctx context.Context, in *createWorkspaceInput) (*workspaceOutput, error) {
	color := in.Body.Color
	if color == "" {
		color = "graphite"
	}
	res, err := a.s.CreateWorkspace(ctx, userID(ctx), in.Body.Name, color, in.Body.Privacy, apimodel.UnwrapStrings(in.Body.Tags))
	if err != nil {
		return nil, hErr(err)
	}
	return &workspaceOutput{Body: apimodel.FromWorkspace(res)}, nil
}

func (a *api) updateWorkspace(ctx context.Context, in *updateWorkspaceInput) (*workspaceOutput, error) {
	p := store.WorkspacePatch{Name: in.Body.Name, Color: in.Body.Color, Privacy: in.Body.Privacy}
	if in.Body.Tags != nil {
		t := apimodel.UnwrapStrings(*in.Body.Tags)
		p.Tags = &t
	}
	res, err := a.s.UpdateWorkspace(ctx, userID(ctx), in.ID, p)
	if err != nil {
		return nil, hErr(err)
	}
	return &workspaceOutput{Body: apimodel.FromWorkspace(res)}, nil
}

func (a *api) deleteWorkspace(ctx context.Context, in *workspaceIDInput) (*Empty, error) {
	if err := a.s.DeleteWorkspace(ctx, userID(ctx), in.ID); err != nil {
		return nil, hErr(err)
	}
	return &Empty{}, nil
}

func (a *api) getWorkspaceStats(ctx context.Context, in *workspaceIDInput) (*workspaceStatsOutput, error) {
	res, err := a.s.WorkspaceStats(ctx, userID(ctx), in.ID)
	if err != nil {
		return nil, hErr(err)
	}
	return &workspaceStatsOutput{Body: res}, nil
}
