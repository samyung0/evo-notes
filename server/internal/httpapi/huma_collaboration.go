package httpapi

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/evonotes/server/internal/httpapi/apimodel"
	"github.com/evonotes/server/internal/materialdoc"
	"github.com/evonotes/server/internal/store"
)

type materialRevisionsOutput struct{ Body []apimodel.MaterialRevision }
type materialSuggestionsOutput struct{ Body []apimodel.MaterialSuggestion }
type materialSuggestionOutput struct{ Body apimodel.MaterialSuggestion }
type discussionsOutput struct{ Body []apimodel.Discussion }
type discussionOutput struct{ Body apimodel.Discussion }
type commentOutput struct{ Body apimodel.Comment }

type createDiscussionInput struct {
	ID   string `path:"id"`
	Body apimodel.CreateDiscussionReq
}
type discussionIDInput struct {
	ID string `path:"id"`
}
type updateDiscussionInput struct {
	ID   string `path:"id"`
	Body apimodel.UpdateDiscussionReq
}
type createCommentInput struct {
	ID   string `path:"id"`
	Body apimodel.CreateCommentReq
}
type updateCommentBodyInput struct {
	ID   string `path:"id"`
	Body apimodel.UpdateCommentReq
}
type createMaterialSuggestionInput struct {
	ID   string `path:"id"`
	Body apimodel.CreateMaterialSuggestionReq
}
type materialSuggestionIDInput struct {
	ID string `path:"id"`
}
type updateMaterialSuggestionStatusInput struct {
	ID   string `path:"id"`
	Body apimodel.UpdateMaterialSuggestionStatusReq
}

func (a *api) registerCollaboration(api huma.API) {
	const tag = "Material collaboration"
	reg(api, http.MethodGet, "/api/materials/{id}/revisions", "listMaterialRevisions", tag, "List material revisions", http.StatusOK, a.listMaterialRevisions)
	reg(api, http.MethodGet, "/api/materials/{id}/suggestions", "listMaterialSuggestions", tag, "List material suggestions", http.StatusOK, a.listMaterialSuggestions)
	reg(api, http.MethodPost, "/api/materials/{id}/suggestions", "createMaterialSuggestion", tag, "Create a material suggestion", http.StatusCreated, a.createMaterialSuggestion)
	reg(api, http.MethodPatch, "/api/material-suggestions/{id}", "updateMaterialSuggestionStatus", tag, "Accept, reject, or withdraw a suggestion", http.StatusOK, a.updateMaterialSuggestionStatus)
	reg(api, http.MethodDelete, "/api/material-suggestions/{id}", "withdrawMaterialSuggestion", tag, "Withdraw a suggestion", http.StatusNoContent, a.withdrawMaterialSuggestion)
	reg(api, http.MethodGet, "/api/materials/{id}/discussions", "listMaterialDiscussions", tag, "List material discussions", http.StatusOK, a.listMaterialDiscussions)
	reg(api, http.MethodPost, "/api/materials/{id}/discussions", "createMaterialDiscussion", tag, "Create a material discussion", http.StatusCreated, a.createMaterialDiscussion)
	reg(api, http.MethodPatch, "/api/discussions/{id}", "updateMaterialDiscussion", tag, "Resolve or reopen a discussion", http.StatusNoContent, a.updateMaterialDiscussion)
	reg(api, http.MethodDelete, "/api/discussions/{id}", "deleteMaterialDiscussion", tag, "Delete a discussion", http.StatusNoContent, a.deleteMaterialDiscussion)
	reg(api, http.MethodPost, "/api/discussions/{id}/comments", "createMaterialComment", tag, "Add a discussion comment", http.StatusCreated, a.createMaterialComment)
	reg(api, http.MethodPatch, "/api/comments/{id}", "updateMaterialComment", tag, "Edit a discussion comment", http.StatusOK, a.updateMaterialComment)
	reg(api, http.MethodDelete, "/api/comments/{id}", "deleteMaterialComment", tag, "Delete a discussion comment", http.StatusNoContent, a.deleteMaterialComment)
}

func (a *api) listMaterialRevisions(ctx context.Context, in *materialIDInput) (*materialRevisionsOutput, error) {
	if _, err := a.s.MaterialAccess(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	rows, err := a.s.ListMaterialRevisions(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	out := make([]apimodel.MaterialRevision, len(rows))
	for i, revision := range rows {
		out[i] = apimodel.FromMaterialRevision(revision)
	}
	return &materialRevisionsOutput{Body: out}, nil
}

func (a *api) listMaterialSuggestions(ctx context.Context, in *materialIDInput) (*materialSuggestionsOutput, error) {
	if _, err := a.s.MaterialAccess(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	suggestions, err := a.s.ListMaterialSuggestions(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	return &materialSuggestionsOutput{Body: apimodel.FromMaterialSuggestions(suggestions)}, nil
}

func (a *api) createMaterialSuggestion(
	ctx context.Context,
	in *createMaterialSuggestionInput,
) (*materialSuggestionOutput, error) {
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	suggestion, err := a.s.CreateMaterialSuggestion(ctx, store.MaterialSuggestion{
		MaterialID:       in.ID,
		UserID:           userID(ctx),
		BaseRevision:     in.Body.BaseRevision,
		Anchor:           apimodel.EncodeRaw(in.Body.Anchor),
		OriginalFragment: apimodel.EncodeRaw(in.Body.OriginalFragment),
		ProposedFragment: apimodel.EncodeRaw(in.Body.ProposedFragment),
	})
	if err != nil {
		return nil, collaborationError(err)
	}
	return &materialSuggestionOutput{Body: apimodel.FromMaterialSuggestion(suggestion)}, nil
}

func (a *api) updateMaterialSuggestionStatus(
	ctx context.Context,
	in *updateMaterialSuggestionStatusInput,
) (*materialSuggestionOutput, error) {
	suggestion, err := a.s.GetMaterialSuggestion(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	role, err := a.s.MaterialEffectiveRole(ctx, userID(ctx), suggestion.MaterialID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if !store.CanSetSuggestionStatus(role, suggestion.UserID == userID(ctx), in.Body.Status) {
		return nil, collaborationError(store.ErrForbidden)
	}
	var updated store.MaterialSuggestion
	if in.Body.Status == store.SuggestionAccepted {
		if in.Body.FinalizedContent == nil || in.Body.ExpectedBaseRevision == nil {
			return nil, huma.Error400BadRequest(
				"finalizedContent and expectedBaseRevision are required when accepting a suggestion",
			)
		}
		finalized, marshalErr := materialdoc.Marshal(*in.Body.FinalizedContent)
		if marshalErr != nil {
			return nil, collaborationError(marshalErr)
		}
		updated, err = a.s.AcceptMaterialSuggestion(
			ctx,
			in.ID,
			userID(ctx),
			finalized,
			*in.Body.ExpectedBaseRevision,
		)
	} else {
		if in.Body.FinalizedContent != nil || in.Body.ExpectedBaseRevision != nil {
			return nil, huma.Error400BadRequest(
				"finalizedContent and expectedBaseRevision are only valid when accepting a suggestion",
			)
		}
		updated, err = a.s.SetMaterialSuggestionStatus(ctx, in.ID, userID(ctx), in.Body.Status)
	}
	if err != nil {
		return nil, collaborationError(err)
	}
	return &materialSuggestionOutput{Body: apimodel.FromMaterialSuggestion(updated)}, nil
}

func (a *api) withdrawMaterialSuggestion(
	ctx context.Context,
	in *materialSuggestionIDInput,
) (*Empty, error) {
	suggestion, err := a.s.GetMaterialSuggestion(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	role, err := a.s.MaterialEffectiveRole(ctx, userID(ctx), suggestion.MaterialID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if !store.CanSetSuggestionStatus(role, suggestion.UserID == userID(ctx), store.SuggestionWithdrawn) {
		return nil, collaborationError(store.ErrForbidden)
	}
	if _, err := a.s.SetMaterialSuggestionStatus(
		ctx,
		in.ID,
		userID(ctx),
		store.SuggestionWithdrawn,
	); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}

func (a *api) listMaterialDiscussions(ctx context.Context, in *materialIDInput) (*discussionsOutput, error) {
	if _, err := a.s.MaterialAccess(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	rows, err := a.s.ListDiscussions(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	return &discussionsOutput{Body: rows}, nil
}

func (a *api) createMaterialDiscussion(ctx context.Context, in *createDiscussionInput) (*discussionOutput, error) {
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), in.ID); err != nil {
		return nil, collaborationError(err)
	}
	discussion, err := a.s.CreateDiscussion(ctx, store.Discussion{
		MaterialID: in.ID, BlockID: in.Body.BlockID, DocumentContent: in.Body.DocumentContent,
		Anchor: apimodel.EncodeRaw(in.Body.Anchor), CreatedBy: userID(ctx),
	}, store.Comment{UserID: userID(ctx), ContentRich: apimodel.EncodeRaw(in.Body.ContentRich)})
	if err != nil {
		return nil, collaborationError(err)
	}
	return &discussionOutput{Body: discussion}, nil
}

func (a *api) updateMaterialDiscussion(ctx context.Context, in *updateDiscussionInput) (*Empty, error) {
	materialID, err := a.s.DiscussionMaterialID(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), materialID); err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.SetDiscussionResolved(ctx, in.ID, in.Body.IsResolved); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}

func (a *api) deleteMaterialDiscussion(ctx context.Context, in *discussionIDInput) (*Empty, error) {
	materialID, err := a.s.DiscussionMaterialID(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), materialID); err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.DeleteDiscussion(ctx, in.ID, userID(ctx)); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}

func (a *api) createMaterialComment(ctx context.Context, in *createCommentInput) (*commentOutput, error) {
	materialID, err := a.s.DiscussionMaterialID(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), materialID); err != nil {
		return nil, collaborationError(err)
	}
	comment, err := a.s.AddComment(ctx, in.ID, userID(ctx), apimodel.EncodeRaw(in.Body.ContentRich))
	if err != nil {
		return nil, collaborationError(err)
	}
	return &commentOutput{Body: comment}, nil
}

func (a *api) updateMaterialComment(ctx context.Context, in *updateCommentBodyInput) (*commentOutput, error) {
	materialID, err := a.s.CommentMaterialID(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), materialID); err != nil {
		return nil, collaborationError(err)
	}
	comment, err := a.s.UpdateComment(ctx, in.ID, userID(ctx), apimodel.EncodeRaw(in.Body.ContentRich))
	if err != nil {
		return nil, collaborationError(err)
	}
	return &commentOutput{Body: comment}, nil
}

func (a *api) deleteMaterialComment(ctx context.Context, in *discussionIDInput) (*Empty, error) {
	materialID, err := a.s.CommentMaterialID(ctx, in.ID)
	if err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.AssertMaterialCommenter(ctx, userID(ctx), materialID); err != nil {
		return nil, collaborationError(err)
	}
	if err := a.s.DeleteComment(ctx, in.ID, userID(ctx)); err != nil {
		return nil, collaborationError(err)
	}
	return &Empty{}, nil
}
