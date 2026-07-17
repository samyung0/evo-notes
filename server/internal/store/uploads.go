package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrUploadExpired = errors.New("upload session expired")
	ErrUploadState   = errors.New("upload session is not pending")
)

type UploadSession struct {
	ID           string
	WorkspaceID  string
	ChapterID    *string
	ObjectPath   string
	FinalPath    string
	Name         string
	Kind         string
	ContentType  string
	DeclaredSize int64
	ParseMode    string
	Status       string
	FileID       *string
	ExpiresAt    time.Time
}

type NewUploadSession struct {
	ID           string
	WorkspaceID  string
	ChapterID    *string
	ObjectPath   string
	FinalPath    string
	Name         string
	Kind         string
	ContentType  string
	DeclaredSize int64
	ParseMode    string
	ExpiresAt    time.Time
}

func (s *Store) CreateUploadSession(ctx context.Context, in NewUploadSession) (UploadSession, error) {
	_, err := s.pool.Exec(ctx, `INSERT INTO upload_sessions
		(id, workspace_id, chapter_id, object_path, final_path, name, kind, content_type, declared_size, parse_mode, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		in.ID, in.WorkspaceID, in.ChapterID, in.ObjectPath, in.FinalPath, in.Name,
		in.Kind, in.ContentType, in.DeclaredSize, in.ParseMode, in.ExpiresAt)
	if err != nil {
		return UploadSession{}, err
	}
	return s.GetUploadSession(ctx, in.ID)
}

func scanUploadSession(row interface{ Scan(...any) error }) (UploadSession, error) {
	var u UploadSession
	err := row.Scan(&u.ID, &u.WorkspaceID, &u.ChapterID, &u.ObjectPath, &u.FinalPath,
		&u.Name, &u.Kind, &u.ContentType, &u.DeclaredSize, &u.ParseMode,
		&u.Status, &u.FileID, &u.ExpiresAt)
	return u, err
}

const uploadSessionCols = `id, workspace_id, chapter_id, object_path, final_path,
	name, kind, content_type, declared_size, parse_mode, status, file_id, expires_at`

func (s *Store) GetUploadSession(ctx context.Context, id string) (UploadSession, error) {
	u, err := scanUploadSession(s.pool.QueryRow(ctx,
		`SELECT `+uploadSessionCols+` FROM upload_sessions WHERE id=$1`, id))
	if isNoRows(err) {
		return u, ErrNotFound
	}
	return u, err
}

// FinalizeUploadSession creates the source and ingest job exactly once. The
// B2 promotion happens before this transaction and is safe to retry.
func (s *Store) FinalizeUploadSession(ctx context.Context, uploadID, sourceETag, parser, engine string) (File, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return File{}, err
	}
	defer tx.Rollback(ctx)

	u, err := scanUploadSession(tx.QueryRow(ctx,
		`SELECT `+uploadSessionCols+` FROM upload_sessions WHERE id=$1 FOR UPDATE`, uploadID))
	if isNoRows(err) {
		return File{}, ErrNotFound
	}
	if err != nil {
		return File{}, err
	}
	if u.Status == "completed" && u.FileID != nil {
		_ = tx.Rollback(ctx)
		return s.GetFile(ctx, *u.FileID)
	}
	if u.Status != "pending" {
		return File{}, ErrUploadState
	}
	if time.Now().UTC().After(u.ExpiresAt) {
		return File{}, ErrUploadExpired
	}

	fileID := uid("f")
	fileURL := "/api/files/" + fileID + "/raw"
	now := time.Now().UTC()
	ready := u.ParseMode == "none" && u.Kind != "txt" && u.Kind != "md"
	status := "processing"
	if ready {
		status = "ready"
	}
	_, err = tx.Exec(ctx, `INSERT INTO files
		(id, workspace_id, chapter_id, name, kind, size_kb, added_at, status, parser, engine, blob_path, url, source_etag)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		fileID, u.WorkspaceID, u.ChapterID, u.Name, u.Kind, int(u.DeclaredSize/1024),
		now, status, parser, engine, u.FinalPath, fileURL, sourceETag)
	if err != nil {
		return File{}, err
	}

	if !ready {
		jobID := uid("job")
		payload, _ := json.Marshal(map[string]string{
			"fileId": fileID, "workspaceId": u.WorkspaceID, "blobPath": u.FinalPath,
			"kind": u.Kind, "parser": parser, "engine": engine,
			"parseMode": u.ParseMode, "sourceETag": sourceETag,
		})
		if _, err := tx.Exec(ctx,
			`INSERT INTO jobs (id, type, payload) VALUES ($1,'ingest',$2)`,
			jobID, payload); err != nil {
			return File{}, err
		}
	}

	if _, err := tx.Exec(ctx, `UPDATE upload_sessions
		SET status='completed', file_id=$2, source_etag=$3, completed_at=now()
		WHERE id=$1`, uploadID, fileID, sourceETag); err != nil {
		return File{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return File{}, err
	}
	return File{
		ID: fileID, WorkspaceID: u.WorkspaceID, ChapterID: u.ChapterID,
		Name: u.Name, Kind: FileKind(u.Kind), SizeKb: int(u.DeclaredSize / 1024),
		AddedAt: now, Status: FileStatus(status), URL: &fileURL,
	}, nil
}

// ExpiredUploadSessions returns a bounded cleanup batch. Completed sessions
// are retained as an audit/idempotency record.
func (s *Store) ExpiredUploadSessions(ctx context.Context, limit int) ([]UploadSession, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+uploadSessionCols+`
		FROM upload_sessions WHERE status='pending' AND expires_at < now()
		ORDER BY expires_at LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UploadSession
	for rows.Next() {
		u, err := scanUploadSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) MarkUploadExpired(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `UPDATE upload_sessions SET status='expired'
		WHERE id=$1 AND status='pending'`)
	return err
}

func (s *Store) PruneUploadSessions(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM upload_sessions
		WHERE (status='completed' AND completed_at < now() - interval '30 days')
		   OR (status='expired' AND expires_at < now() - interval '7 days')`)
	return err
}

// DeleteFileWithOrphanedBlobs deletes the file row and returns only storage
// keys no remaining file references. Workspace clones may intentionally share
// a source blob, so callers must not blindly delete every returned file path.
func (s *Store) DeleteFileWithOrphanedBlobs(ctx context.Context, id string) ([]string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var source, parsed *string
	err = tx.QueryRow(ctx, `SELECT blob_path, parsed_blob_path FROM files
		WHERE id=$1 FOR UPDATE`, id).Scan(&source, &parsed)
	if isNoRows(err) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM files WHERE id=$1`, id); err != nil {
		return nil, err
	}
	var orphaned []string
	for _, path := range []*string{source, parsed} {
		if path == nil || *path == "" {
			continue
		}
		var count int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM files
			WHERE blob_path=$1 OR parsed_blob_path=$1`, *path).Scan(&count); err != nil {
			return nil, err
		}
		if count == 0 {
			orphaned = append(orphaned, *path)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return orphaned, nil
}
