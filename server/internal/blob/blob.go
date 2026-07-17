// Package blob stores uploaded source bytes in Backblaze B2.
package blob

import (
	"context"
	"io"
	"time"
)

type ObjectInfo struct {
	Size        int64
	ContentType string
	ETag        string
}

type PresignedPut struct {
	URL       string
	Headers   map[string]string
	ExpiresAt time.Time
}

type Store interface {
	// Put writes r under a key derived from id and returns the storage path
	// and number of bytes written.
	Put(id string, r io.Reader) (path string, size int64, err error)
	PresignGet(ctx context.Context, path string) (url string, err error)
	PresignPut(ctx context.Context, path, contentType string) (PresignedPut, error)
	Head(ctx context.Context, path string) (ObjectInfo, error)
	Promote(ctx context.Context, from, to string) error
	Delete(ctx context.Context, path string) error
}
