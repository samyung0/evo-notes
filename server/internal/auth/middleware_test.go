package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPublicReadPrefixOnlyBypassesReads(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	handler := Middleware(Config{
		SecretKey:        "test-secret",
		PublicReadPrefix: []string{"/api/workspaces/"},
	})(next)

	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/workspaces/ws_shared", nil))
	if get.Code != http.StatusNoContent {
		t.Fatalf("shared GET returned %d", get.Code)
	}

	post := httptest.NewRecorder()
	handler.ServeHTTP(post, httptest.NewRequest(http.MethodPost, "/api/workspaces/ws_shared", nil))
	if post.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous write returned %d", post.Code)
	}
}
