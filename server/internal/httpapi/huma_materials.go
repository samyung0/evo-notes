package httpapi

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/evonotes/server/internal/httpapi/apimodel"
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

func (a *api) registerMaterials(api huma.API) {
	const tag = "Materials"
	reg(api, http.MethodGet, "/api/workspaces/{id}/materials", "listMaterials", tag, "List study materials", http.StatusOK, a.listMaterials)
	reg(api, http.MethodGet, "/api/materials/{id}", "getMaterial", tag, "Get a material", http.StatusOK, a.getMaterial)
	reg(api, http.MethodDelete, "/api/materials/{id}", "deleteMaterial", tag, "Delete a material", http.StatusNoContent, a.deleteMaterial)
}

func (a *api) listMaterials(ctx context.Context, in *workspaceIDInput) (*materialRefsOutput, error) {
	if err := a.assertOwner(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	res, err := a.s.ListMaterialRefs(ctx, in.ID)
	if err != nil {
		return nil, hErr(err)
	}
	return &materialRefsOutput{Body: res}, nil
}

func (a *api) getMaterial(ctx context.Context, in *materialIDInput) (*materialOutput, error) {
	res, err := a.s.GetMaterial(ctx, in.ID)
	if err != nil {
		return nil, hErr(err)
	}
	return &materialOutput{Body: res}, nil
}

func (a *api) deleteMaterial(ctx context.Context, in *materialIDInput) (*Empty, error) {
	if err := a.s.DeleteMaterial(ctx, in.ID); err != nil {
		return nil, hErr(err)
	}
	return &Empty{}, nil
}
