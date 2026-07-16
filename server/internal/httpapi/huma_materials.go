package httpapi

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/evonotes/server/internal/httpapi/apimodel"
	"github.com/evonotes/server/internal/store"
)

type materialRefsOutput struct {
	Body []apimodel.MaterialRef
}
type materialOutput struct {
	Body apimodel.Material
}
type materialIDInput struct {
	ID string `path:"id"`
}
type createMaterialInput struct {
	ID   string `path:"id"`
	Body apimodel.CreateMaterialReq
}
type updateMaterialInput struct {
	ID   string `path:"id"`
	Body apimodel.UpdateMaterialReq
}

func (a *api) registerMaterials(api huma.API) {
	const tag = "Materials"
	reg(api, http.MethodGet, "/api/workspaces/{id}/materials", "listMaterials", tag, "List study materials", http.StatusOK, a.listMaterials)
	reg(api, http.MethodPost, "/api/workspaces/{id}/materials", "createMaterial", tag, "Create a note material", http.StatusCreated, a.createMaterial)
	reg(api, http.MethodGet, "/api/materials/{id}", "getMaterial", tag, "Get a material", http.StatusOK, a.getMaterial)
	reg(api, http.MethodPatch, "/api/materials/{id}", "updateMaterial", tag, "Update a material", http.StatusOK, a.updateMaterial)
	reg(api, http.MethodDelete, "/api/materials/{id}", "deleteMaterial", tag, "Delete a material", http.StatusNoContent, a.deleteMaterial)
}

// assertMaterialOwner resolves a material's workspace and checks ownership.
func (a *api) assertMaterialOwner(ctx context.Context, matID string) error {
	wsID, err := a.s.MaterialWorkspaceID(ctx, matID)
	if err != nil {
		return err
	}
	return a.assertOwner(ctx, wsID)
}

func (a *api) listMaterials(ctx context.Context, in *workspaceIDInput) (*materialRefsOutput, error) {
	if _, err := a.workspaceRead(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	res, err := a.s.ListMaterialRefs(ctx, in.ID)
	if err != nil {
		return nil, hErr(err)
	}
	return &materialRefsOutput{Body: res}, nil
}

func (a *api) createMaterial(ctx context.Context, in *createMaterialInput) (*materialOutput, error) {
	if err := a.assertOwner(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	ws, err := a.s.GetWorkspace(ctx, userID(ctx), in.ID, false)
	if err != nil {
		return nil, hErr(err)
	}
	kind := in.Body.Kind
	if kind == "" {
		kind = "note"
	}
	title := in.Body.Title
	if title == "" {
		title = "Untitled note"
	}
	res, err := a.s.CreateMaterial(ctx, store.Material{
		WorkspaceID:   in.ID,
		WorkspaceName: ws.Name,
		Kind:          kind,
		Title:         title,
		Content:       in.Body.Content,
		ScopeChapters: in.Body.ScopeChapters,
		ScopeFileIDs:  in.Body.ScopeFileIDs,
		Privacy:       "private",
	})
	if err != nil {
		return nil, hErr(err)
	}
	res.IsOwner = true
	return &materialOutput{Body: res}, nil
}

func (a *api) getMaterial(ctx context.Context, in *materialIDInput) (*materialOutput, error) {
	isOwner, err := a.materialRead(ctx, in.ID)
	if err != nil {
		return nil, hErr(err)
	}
	res, err := a.s.GetMaterial(ctx, in.ID)
	if err != nil {
		return nil, hErr(err)
	}
	res.IsOwner = isOwner
	return &materialOutput{Body: res}, nil
}

func (a *api) updateMaterial(ctx context.Context, in *updateMaterialInput) (*materialOutput, error) {
	if err := a.assertMaterialOwner(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	patch := store.MaterialPatch{
		Title:         in.Body.Title,
		Content:       in.Body.Content,
		ScopeChapters: in.Body.ScopeChapters,
		ScopeFileIDs:  in.Body.ScopeFileIDs,
		Privacy:       in.Body.Privacy,
	}
	// chapterId: "" unfiles (NULL), a real id files it, omitted leaves it.
	if in.Body.ChapterID != nil {
		if *in.Body.ChapterID == "" {
			var none *string
			patch.ChapterID = &none
		} else {
			cid := *in.Body.ChapterID
			p := &cid
			patch.ChapterID = &p
		}
	}
	res, err := a.s.UpdateMaterial(ctx, in.ID, patch)
	if err != nil {
		return nil, hErr(err)
	}
	res.IsOwner = true
	return &materialOutput{Body: res}, nil
}

func (a *api) deleteMaterial(ctx context.Context, in *materialIDInput) (*Empty, error) {
	if err := a.assertMaterialOwner(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	if err := a.s.DeleteMaterial(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	return &Empty{}, nil
}
