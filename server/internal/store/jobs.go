package store

import (
	"context"
	"encoding/json"
	"time"
)

// CreateSourceWithJob inserts an uploaded file as 'processing' and enqueues an
// ingest job in the same transaction (Postgres-backed queue; the Python worker
// claims it with SKIP LOCKED). The file's url points at the raw-blob endpoint
// so the viewer can render it immediately.
func (s *Store) CreateSourceWithJob(ctx context.Context, wsID, name, kind string, chapterID *string, sizeKb int, blobPath, parser, engine string) (File, string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return File{}, "", err
	}
	defer tx.Rollback(ctx)

	fileID := uid("f")
	url := "/api/files/" + fileID + "/raw"
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `INSERT INTO files (id, workspace_id, chapter_id, name, kind, size_kb, added_at, status, parser, engine, blob_path, url)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'processing',$8,$9,$10,$11)`,
		fileID, wsID, chapterID, name, kind, sizeKb, now, parser, engine, blobPath, url); err != nil {
		return File{}, "", err
	}

	jobID := uid("job")
	payload, _ := json.Marshal(map[string]string{
		"fileId": fileID, "workspaceId": wsID, "blobPath": blobPath, "kind": kind, "parser": parser, "engine": engine,
	})
	if _, err := tx.Exec(ctx, `INSERT INTO jobs (id, type, payload) VALUES ($1,'ingest',$2)`, jobID, payload); err != nil {
		return File{}, "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return File{}, "", err
	}

	f := File{ID: fileID, WorkspaceID: wsID, ChapterID: chapterID, Name: name, Kind: kind, SizeKb: sizeKb, AddedAt: now, Status: "processing", URL: &url}
	return f, jobID, nil
}

// FileBlob returns the on-disk blob path and kind for streaming a raw file.
func (s *Store) FileBlob(ctx context.Context, id string) (blobPath string, kind string, content *string, url *string, err error) {
	var bp *string
	err = s.pool.QueryRow(ctx, `SELECT blob_path, kind, content, url FROM files WHERE id=$1`, id).Scan(&bp, &kind, &content, &url)
	if isNoRows(err) {
		return "", "", nil, nil, ErrNotFound
	}
	if bp != nil {
		blobPath = *bp
	}
	return blobPath, kind, content, url, err
}
