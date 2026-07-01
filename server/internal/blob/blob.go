// Package blob stores uploaded source bytes. Two backends implement Store:
// Disk (local filesystem, the default for local dev) and S3 (any
// S3-compatible object store — Backblaze B2 in production). main.go picks one
// from BLOB_BACKEND; callers only ever see the Store interface.
package blob

import (
	"context"
	"io"
	"os"
	"path/filepath"
)

type Store interface {
	// Put writes r under a key derived from id and returns the storage path
	// and number of bytes written.
	Put(id string, r io.Reader) (path string, size int64, err error)
	Open(path string) (io.ReadCloser, error)
}

// Presigner is an optional Store capability. Object stores (S3/B2) can mint a
// short-lived public URL so the gateway redirects the client straight to the
// bucket instead of proxying bytes. Disk does not implement it, so callers must
// type-assert and fall back to Open.
type Presigner interface {
	PresignGet(ctx context.Context, path string) (url string, err error)
}

// HealthChecker is an optional Store capability used at startup to fail fast on
// a misconfigured bucket / bad credentials.
type HealthChecker interface {
	HealthCheck(ctx context.Context) error
}

type Disk struct{ dir string }

func NewDisk(dir string) (*Disk, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Disk{dir: dir}, nil
}

func (d *Disk) Put(id string, r io.Reader) (string, int64, error) {
	path := filepath.Join(d.dir, id)
	f, err := os.Create(path)
	if err != nil {
		return "", 0, err
	}
	defer f.Close()
	n, err := io.Copy(f, r)
	if err != nil {
		return "", 0, err
	}
	return path, n, nil
}

func (d *Disk) Open(path string) (io.ReadCloser, error) { return os.Open(path) }
