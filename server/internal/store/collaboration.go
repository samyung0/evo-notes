package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/evonotes/server/internal/materialdoc"
	"github.com/jackc/pgx/v5"
)

func (s *Store) ListWorkspaceMembers(ctx context.Context, wsID string) ([]WorkspaceMember, error) {
	rows, err := s.pool.Query(ctx, `SELECT wm.workspace_id, wm.user_id, u.name, u.email,
		COALESCE(u.avatar_url,''), wm.role, wm.created_at
		FROM workspace_members wm JOIN users u ON u.id=wm.user_id
		WHERE wm.workspace_id=$1 ORDER BY CASE wm.role WHEN 'owner' THEN 0 ELSE 1 END, u.name`, wsID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WorkspaceMember{}
	for rows.Next() {
		var member WorkspaceMember
		if err := rows.Scan(&member.WorkspaceID, &member.UserID, &member.Name, &member.Email,
			&member.AvatarURL, &member.Role, &member.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, member)
	}
	return out, rows.Err()
}

func (s *Store) SetWorkspaceMemberRole(ctx context.Context, wsID, memberID string, role WorkspaceRole) error {
	if role != RoleEditor && role != RoleCommenter && role != RoleViewer {
		return ErrForbidden
	}
	ct, err := s.pool.Exec(ctx, `UPDATE workspace_members SET role=$3, updated_at=now()
		WHERE workspace_id=$1 AND user_id=$2 AND role<>'owner'`, wsID, memberID, role)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) RemoveWorkspaceMember(ctx context.Context, wsID, memberID string) error {
	ct, err := s.pool.Exec(ctx, `DELETE FROM workspace_members
		WHERE workspace_id=$1 AND user_id=$2 AND role<>'owner'`, wsID, memberID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) CreateWorkspaceInvite(ctx context.Context, wsID, email string, role WorkspaceRole, invitedBy string) (WorkspaceInvite, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || (role != RoleEditor && role != RoleCommenter && role != RoleViewer) {
		return WorkspaceInvite{}, ErrForbidden
	}
	token, err := inviteToken()
	if err != nil {
		return WorkspaceInvite{}, err
	}
	invite := WorkspaceInvite{
		ID: uid("inv"), WorkspaceID: wsID, Email: email, Role: role,
		Token: token, InvitedBy: invitedBy,
		ExpiresAt: time.Now().UTC().Add(7 * 24 * time.Hour), CreatedAt: time.Now().UTC(),
	}
	tokenHash := inviteTokenHash(token)
	err = s.pool.QueryRow(ctx, `INSERT INTO workspace_invites
		(id, workspace_id, email, role, token_hash, invited_by, expires_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (workspace_id, lower(email))
			WHERE accepted_at IS NULL AND revoked_at IS NULL
		DO UPDATE SET role=EXCLUDED.role, token_hash=EXCLUDED.token_hash, invited_by=EXCLUDED.invited_by,
			expires_at=EXCLUDED.expires_at, created_at=EXCLUDED.created_at
		RETURNING id`, invite.ID, invite.WorkspaceID, invite.Email, invite.Role, tokenHash[:],
		invite.InvitedBy, invite.ExpiresAt, invite.CreatedAt).Scan(&invite.ID)
	return invite, err
}

func inviteToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func inviteTokenHash(token string) [sha256.Size]byte {
	return sha256.Sum256([]byte(token))
}

func (s *Store) ListWorkspaceInvites(ctx context.Context, wsID string) ([]WorkspaceInvite, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, workspace_id, email, role, invited_by,
		expires_at, accepted_at, revoked_at, created_at
		FROM workspace_invites WHERE workspace_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC`, wsID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WorkspaceInvite{}
	for rows.Next() {
		var invite WorkspaceInvite
		if err := rows.Scan(&invite.ID, &invite.WorkspaceID, &invite.Email, &invite.Role,
			&invite.InvitedBy, &invite.ExpiresAt, &invite.AcceptedAt,
			&invite.RevokedAt, &invite.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, invite)
	}
	return out, rows.Err()
}

func (s *Store) RevokeWorkspaceInvite(ctx context.Context, wsID, inviteID string) error {
	ct, err := s.pool.Exec(ctx, `UPDATE workspace_invites SET revoked_at=now()
		WHERE id=$1 AND workspace_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL`, inviteID, wsID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) AcceptWorkspaceInvite(ctx context.Context, token, userID string) (WorkspaceMember, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return WorkspaceMember{}, err
	}
	defer tx.Rollback(ctx)
	var invite WorkspaceInvite
	tokenHash := inviteTokenHash(token)
	err = tx.QueryRow(ctx, `SELECT id, workspace_id, email, role, invited_by,
		expires_at, accepted_at, revoked_at, created_at
		FROM workspace_invites WHERE token_hash=$1 FOR UPDATE`, tokenHash[:]).
		Scan(&invite.ID, &invite.WorkspaceID, &invite.Email, &invite.Role,
			&invite.InvitedBy, &invite.ExpiresAt, &invite.AcceptedAt, &invite.RevokedAt, &invite.CreatedAt)
	if isNoRows(err) {
		return WorkspaceMember{}, ErrNotFound
	}
	if err != nil {
		return WorkspaceMember{}, err
	}
	if invite.AcceptedAt != nil || invite.RevokedAt != nil || time.Now().UTC().After(invite.ExpiresAt) {
		return WorkspaceMember{}, ErrNotFound
	}
	var email string
	if err := tx.QueryRow(ctx, `SELECT lower(email) FROM users WHERE id=$1`, userID).Scan(&email); err != nil {
		return WorkspaceMember{}, err
	}
	if email != strings.ToLower(invite.Email) {
		return WorkspaceMember{}, ErrForbidden
	}
	if _, err := tx.Exec(ctx, `INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1,$2,$3) ON CONFLICT (workspace_id,user_id)
		DO UPDATE SET role=CASE
			WHEN workspace_members.role='owner' THEN workspace_members.role
			ELSE EXCLUDED.role
		END, updated_at=now()`, invite.WorkspaceID, userID, invite.Role); err != nil {
		return WorkspaceMember{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE workspace_invites SET accepted_by=$2, accepted_at=now() WHERE id=$1`,
		invite.ID, userID); err != nil {
		return WorkspaceMember{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return WorkspaceMember{}, err
	}
	members, err := s.ListWorkspaceMembers(ctx, invite.WorkspaceID)
	if err != nil {
		return WorkspaceMember{}, err
	}
	for _, member := range members {
		if member.UserID == userID {
			return member, nil
		}
	}
	return WorkspaceMember{}, ErrNotFound
}

func (s *Store) ListMaterialRevisions(ctx context.Context, materialID string) ([]MaterialRevision, error) {
	rows, err := s.pool.Query(ctx, `SELECT material_id, revision, title, content, created_by, created_at
		FROM material_revisions WHERE material_id=$1 ORDER BY revision DESC`, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MaterialRevision{}
	for rows.Next() {
		var revision MaterialRevision
		if err := rows.Scan(&revision.MaterialID, &revision.Revision, &revision.Title,
			&revision.Content, &revision.CreatedBy, &revision.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, revision)
	}
	return out, rows.Err()
}

func scanMaterialSuggestion(row pgx.Row) (MaterialSuggestion, error) {
	var suggestion MaterialSuggestion
	err := row.Scan(
		&suggestion.ID,
		&suggestion.MaterialID,
		&suggestion.UserID,
		&suggestion.BaseRevision,
		&suggestion.Anchor,
		&suggestion.OriginalFragment,
		&suggestion.ProposedFragment,
		&suggestion.Status,
		&suggestion.ReviewedBy,
		&suggestion.ReviewedAt,
		&suggestion.CreatedAt,
		&suggestion.UpdatedAt,
	)
	return suggestion, err
}

const materialSuggestionColumns = `id, material_id, user_id, base_revision, anchor,
	original_fragment, proposed_fragment, status, reviewed_by, reviewed_at, created_at, updated_at`

func (s *Store) ListMaterialSuggestions(ctx context.Context, materialID string) ([]MaterialSuggestion, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+materialSuggestionColumns+`
		FROM material_suggestions WHERE material_id=$1 ORDER BY created_at`, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MaterialSuggestion{}
	for rows.Next() {
		suggestion, err := scanMaterialSuggestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, suggestion)
	}
	return out, rows.Err()
}

func (s *Store) GetMaterialSuggestion(ctx context.Context, id string) (MaterialSuggestion, error) {
	suggestion, err := scanMaterialSuggestion(s.pool.QueryRow(ctx, `SELECT `+
		materialSuggestionColumns+` FROM material_suggestions WHERE id=$1`, id))
	if isNoRows(err) {
		return MaterialSuggestion{}, ErrNotFound
	}
	return suggestion, err
}

func (s *Store) CreateMaterialSuggestion(ctx context.Context, suggestion MaterialSuggestion) (MaterialSuggestion, error) {
	if suggestion.BaseRevision < 1 {
		return MaterialSuggestion{}, ErrConflict
	}
	if err := validateRichContent(suggestion.OriginalFragment); err != nil {
		return MaterialSuggestion{}, err
	}
	if err := validateRichContent(suggestion.ProposedFragment); err != nil {
		return MaterialSuggestion{}, err
	}
	if len(suggestion.Anchor) == 0 || string(suggestion.Anchor) == "null" {
		suggestion.Anchor = json.RawMessage("{}")
	}
	var anchor map[string]any
	if err := json.Unmarshal(suggestion.Anchor, &anchor); err != nil || anchor == nil {
		return MaterialSuggestion{}, fmt.Errorf("%w: anchor must be an object", materialdoc.ErrInvalid)
	}
	suggestion.ID = uid("sug")
	created, err := scanMaterialSuggestion(s.pool.QueryRow(ctx, `INSERT INTO material_suggestions
		(id, material_id, user_id, base_revision, anchor, original_fragment, proposed_fragment)
		SELECT $1,$2,$3,$4,$5,$6,$7 FROM materials
		WHERE id=$2 AND revision=$4
		RETURNING `+materialSuggestionColumns,
		suggestion.ID,
		suggestion.MaterialID,
		suggestion.UserID,
		suggestion.BaseRevision,
		suggestion.Anchor,
		suggestion.OriginalFragment,
		suggestion.ProposedFragment,
	))
	if !isNoRows(err) {
		return created, err
	}
	var exists bool
	if queryErr := s.pool.QueryRow(ctx, `SELECT exists(SELECT 1 FROM materials WHERE id=$1)`,
		suggestion.MaterialID).Scan(&exists); queryErr != nil {
		return MaterialSuggestion{}, queryErr
	}
	if !exists {
		return MaterialSuggestion{}, ErrNotFound
	}
	return MaterialSuggestion{}, ErrConflict
}

func CanSetSuggestionStatus(role WorkspaceRole, actorIsAuthor bool, status SuggestionStatus) bool {
	switch status {
	case SuggestionAccepted, SuggestionRejected:
		return RoleCanEdit(role)
	case SuggestionWithdrawn:
		return actorIsAuthor && RoleCanComment(role)
	default:
		return false
	}
}

func SuggestionStatusTransitionAllowed(current, next SuggestionStatus) bool {
	if current != SuggestionPending {
		return false
	}
	return next == SuggestionAccepted || next == SuggestionRejected || next == SuggestionWithdrawn
}

func (s *Store) SetMaterialSuggestionStatus(
	ctx context.Context,
	id, actorID string,
	status SuggestionStatus,
) (MaterialSuggestion, error) {
	if !SuggestionStatusTransitionAllowed(SuggestionPending, status) {
		return MaterialSuggestion{}, ErrForbidden
	}
	var reviewer any
	var reviewedAt any
	switch status {
	case SuggestionAccepted, SuggestionRejected:
		reviewer = actorID
		reviewedAt = time.Now().UTC()
	case SuggestionWithdrawn:
		reviewer = nil
		reviewedAt = nil
	default:
		return MaterialSuggestion{}, ErrForbidden
	}
	suggestion, err := scanMaterialSuggestion(s.pool.QueryRow(ctx, `UPDATE material_suggestions
		SET status=$2, reviewed_by=$3, reviewed_at=$4, updated_at=now()
		WHERE id=$1 AND status='pending'
		RETURNING `+materialSuggestionColumns, id, status, reviewer, reviewedAt))
	if !isNoRows(err) {
		return suggestion, err
	}
	var exists bool
	if queryErr := s.pool.QueryRow(ctx, `SELECT exists(SELECT 1 FROM material_suggestions WHERE id=$1)`,
		id).Scan(&exists); queryErr != nil {
		return MaterialSuggestion{}, queryErr
	}
	if !exists {
		return MaterialSuggestion{}, ErrNotFound
	}
	return MaterialSuggestion{}, ErrConflict
}

func validateRichContent(content json.RawMessage) error {
	var value []map[string]any
	if err := json.Unmarshal(content, &value); err != nil {
		return fmt.Errorf("%w: %v", materialdoc.ErrInvalid, err)
	}
	return materialdoc.Validate(materialdoc.Envelope{SchemaVersion: materialdoc.SchemaVersion, Value: value})
}

func scanComment(row pgx.Row) (Comment, error) {
	var comment Comment
	err := row.Scan(&comment.ID, &comment.DiscussionID, &comment.UserID, &comment.ContentRich,
		&comment.IsEdited, &comment.CreatedAt, &comment.UpdatedAt)
	return comment, err
}

func (s *Store) ListDiscussions(ctx context.Context, materialID string) ([]Discussion, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, material_id, block_id, document_content, anchor,
		created_by, is_resolved, created_at, updated_at
		FROM material_discussions WHERE material_id=$1 ORDER BY created_at`, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Discussion{}
	for rows.Next() {
		var discussion Discussion
		if err := rows.Scan(&discussion.ID, &discussion.MaterialID, &discussion.BlockID,
			&discussion.DocumentContent, &discussion.Anchor, &discussion.CreatedBy,
			&discussion.IsResolved, &discussion.CreatedAt, &discussion.UpdatedAt); err != nil {
			return nil, err
		}
		commentRows, err := s.pool.Query(ctx, `SELECT id, discussion_id, user_id, content_rich,
			is_edited, created_at, updated_at FROM material_comments
			WHERE discussion_id=$1 ORDER BY created_at`, discussion.ID)
		if err != nil {
			return nil, err
		}
		discussion.Comments = []Comment{}
		for commentRows.Next() {
			comment, err := scanComment(commentRows)
			if err != nil {
				commentRows.Close()
				return nil, err
			}
			discussion.Comments = append(discussion.Comments, comment)
		}
		if err := commentRows.Err(); err != nil {
			commentRows.Close()
			return nil, err
		}
		commentRows.Close()
		out = append(out, discussion)
	}
	return out, rows.Err()
}

func (s *Store) CreateDiscussion(ctx context.Context, discussion Discussion, firstComment Comment) (Discussion, error) {
	if err := validateRichContent(firstComment.ContentRich); err != nil {
		return Discussion{}, err
	}
	discussion.ID = uid("disc")
	firstComment.ID = uid("com")
	firstComment.DiscussionID = discussion.ID
	if len(discussion.Anchor) == 0 {
		discussion.Anchor = json.RawMessage("{}")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Discussion{}, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `INSERT INTO material_discussions
		(id, material_id, block_id, document_content, anchor, created_by)
		VALUES ($1,$2,$3,$4,$5,$6)`, discussion.ID, discussion.MaterialID, discussion.BlockID,
		discussion.DocumentContent, discussion.Anchor, discussion.CreatedBy); err != nil {
		return Discussion{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO material_comments
		(id, discussion_id, user_id, content_rich) VALUES ($1,$2,$3,$4)`,
		firstComment.ID, discussion.ID, firstComment.UserID, firstComment.ContentRich); err != nil {
		return Discussion{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Discussion{}, err
	}
	items, err := s.ListDiscussions(ctx, discussion.MaterialID)
	if err != nil {
		return Discussion{}, err
	}
	for _, item := range items {
		if item.ID == discussion.ID {
			return item, nil
		}
	}
	return Discussion{}, ErrNotFound
}

func (s *Store) AddComment(ctx context.Context, discussionID, userID string, content json.RawMessage) (Comment, error) {
	if err := validateRichContent(content); err != nil {
		return Comment{}, err
	}
	id := uid("com")
	return scanComment(s.pool.QueryRow(ctx, `INSERT INTO material_comments
		(id, discussion_id, user_id, content_rich) VALUES ($1,$2,$3,$4)
		RETURNING id, discussion_id, user_id, content_rich, is_edited, created_at, updated_at`,
		id, discussionID, userID, content))
}

func (s *Store) UpdateComment(ctx context.Context, id, userID string, content json.RawMessage) (Comment, error) {
	if err := validateRichContent(content); err != nil {
		return Comment{}, err
	}
	comment, err := scanComment(s.pool.QueryRow(ctx, `UPDATE material_comments
		SET content_rich=$3, is_edited=true, updated_at=now()
		WHERE id=$1 AND user_id=$2
		RETURNING id, discussion_id, user_id, content_rich, is_edited, created_at, updated_at`,
		id, userID, content))
	if isNoRows(err) {
		return Comment{}, ErrNotFound
	}
	return comment, err
}

func (s *Store) DeleteComment(ctx context.Context, id, userID string) error {
	ct, err := s.pool.Exec(ctx, `DELETE FROM material_comments WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetDiscussionResolved(ctx context.Context, id string, resolved bool) error {
	ct, err := s.pool.Exec(ctx, `UPDATE material_discussions
		SET is_resolved=$2, updated_at=now() WHERE id=$1`, id, resolved)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeleteDiscussion(ctx context.Context, id, userID string) error {
	ct, err := s.pool.Exec(ctx, `DELETE FROM material_discussions WHERE id=$1 AND created_by=$2`, id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DiscussionMaterialID(ctx context.Context, discussionID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `SELECT material_id FROM material_discussions WHERE id=$1`, discussionID).Scan(&id)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	return id, err
}

func (s *Store) CommentMaterialID(ctx context.Context, commentID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `SELECT d.material_id FROM material_comments c
		JOIN material_discussions d ON d.id=c.discussion_id WHERE c.id=$1`, commentID).Scan(&id)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	return id, err
}
