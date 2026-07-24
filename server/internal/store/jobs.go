package store

import (
	"context"
	"encoding/json"
	"time"
)

// CreateSourceWithJob inserts an uploaded file as 'processing' and enqueues an
// ingest job in the same transaction (Postgres-backed queue; the Python worker
// claims it with SKIP LOCKED). The file's url points at the raw-blob endpoint
// so the viewer can render it immediately. parseMode selects how the worker
// parses the document: 'advanced' (Modal GPU MinerU), 'normal' (MinerU
// lightweight cloud API) — text kinds ignore it and are inserted directly.
func (s *Store) CreateSourceWithJob(ctx context.Context, wsID, name, kind string, chapterID *string, chapterName string, sizeKb int, blobPath, parser, engine, parseMode string) (File, string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return File{}, "", err
	}
	defer tx.Rollback(ctx)

	chapterID, err = resolveUploadChapterID(ctx, tx, wsID, chapterID, chapterName)
	if err != nil {
		return File{}, "", err
	}
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
		"fileId": fileID, "workspaceId": wsID, "blobPath": blobPath, "kind": kind,
		"parser": parser, "engine": engine, "parseMode": parseMode,
	})
	if _, err := tx.Exec(ctx, `INSERT INTO jobs (id, type, payload) VALUES ($1,'ingest',$2)`, jobID, payload); err != nil {
		return File{}, "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return File{}, "", err
	}

	f := File{ID: fileID, WorkspaceID: wsID, ChapterID: chapterID, Name: name, Kind: FileKind(kind), SizeKb: sizeKb, AddedAt: now, Status: "processing", URL: &url}
	return f, jobID, nil
}

// CreateSourceReady inserts an uploaded file that skips parsing entirely
// (parse mode 'none' / formats no parser supports). The blob is stored for
// viewing but no ingest job is enqueued, so the file is 'ready' at once.
func (s *Store) CreateSourceReady(ctx context.Context, wsID, name, kind string, chapterID *string, chapterName string, sizeKb int, blobPath string) (File, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return File{}, err
	}
	defer tx.Rollback(ctx)

	chapterID, err = resolveUploadChapterID(ctx, tx, wsID, chapterID, chapterName)
	if err != nil {
		return File{}, err
	}
	fileID := uid("f")
	url := "/api/files/" + fileID + "/raw"
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `INSERT INTO files (id, workspace_id, chapter_id, name, kind, size_kb, added_at, status, blob_path, url)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'ready',$8,$9)`,
		fileID, wsID, chapterID, name, kind, sizeKb, now, blobPath, url); err != nil {
		return File{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return File{}, err
	}
	return File{ID: fileID, WorkspaceID: wsID, ChapterID: chapterID, Name: name, Kind: FileKind(kind), SizeKb: sizeKb, AddedAt: now, Status: "ready", URL: &url}, nil
}

// FileBlob returns the B2 object key and kind for a raw file.
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
