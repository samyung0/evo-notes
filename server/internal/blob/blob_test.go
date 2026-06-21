package blob

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDiskPutOpenRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store, err := NewDisk(dir)
	if err != nil {
		t.Fatalf("NewDisk: %v", err)
	}

	content := "the mitochondria is the powerhouse of the cell"
	path, size, err := store.Put("blob_abc", strings.NewReader(content))
	if err != nil {
		t.Fatalf("Put: %v", err)
	}
	if size != int64(len(content)) {
		t.Errorf("size = %d, want %d", size, len(content))
	}
	if filepath.Dir(path) != dir {
		t.Errorf("blob written outside dir: %q", path)
	}

	rc, err := store.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer rc.Close()
	got, err := io.ReadAll(rc)
	if err != nil {
		t.Fatalf("ReadAll: %v", err)
	}
	if string(got) != content {
		t.Errorf("round-trip mismatch: got %q want %q", got, content)
	}
}

func TestNewDiskCreatesDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "blobs")
	if _, err := NewDisk(dir); err != nil {
		t.Fatalf("NewDisk nested: %v", err)
	}
	if _, err := os.Stat(dir); err != nil {
		t.Errorf("expected dir created: %v", err)
	}
}

func TestOpenMissing(t *testing.T) {
	store, _ := NewDisk(t.TempDir())
	if _, err := store.Open(filepath.Join(t.TempDir(), "nope")); err == nil {
		t.Errorf("expected error opening missing blob")
	}
}
