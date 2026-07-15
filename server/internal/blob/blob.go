// Package blob stores uploaded source bytes in Backblaze B2.
package blob

import (
	"context"
	"io"
)

type Store interface {
	// Put writes r under a key derived from id and returns the storage path
	// and number of bytes written.
	Put(id string, r io.Reader) (path string, size int64, err error)
	PresignGet(ctx context.Context, path string) (url string, err error)
}
