// Package blob stores uploaded source bytes. Local disk now; the Store
// interface lets an S3-compatible backend drop in later without touching
// callers.
package blob

import (
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
