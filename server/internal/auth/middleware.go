package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	clerk "github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

// Config drives auth middleware behaviour.
type Config struct {
	SecretKey    string
	Disabled     bool // AUTH_DISABLED=true → use DevUserID without JWT
	DevUserID    string
	Store        UserStore
	PublicPrefix []string // path prefixes that skip auth
}

// UserStore lazily provisions users on first authenticated request.
type UserStore interface {
	UpsertUserFromClerk(ctx context.Context, id, name, email, avatarURL string) error
}

func isPublic(path string, prefixes []string) bool {
	for _, p := range prefixes {
		if path == p || strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}

// Middleware validates Clerk JWTs (or bypasses when Disabled).
func Middleware(cfg Config) func(http.Handler) http.Handler {
	if cfg.DevUserID == "" {
		cfg.DevUserID = "u_1"
	}
	public := append([]string{
		"/healthz",
		"/webhooks/clerk",
		"/webhooks/stripe",
	}, cfg.PublicPrefix...)

	if cfg.SecretKey != "" {
		clerk.SetKey(cfg.SecretKey)
	}

	var clerkMW func(http.Handler) http.Handler
	if cfg.SecretKey != "" && !cfg.Disabled {
		clerkMW = clerkhttp.WithHeaderAuthorization()
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isPublic(r.URL.Path, public) {
				next.ServeHTTP(w, r)
				return
			}

			// Only /api/* requires auth (except public prefixes above).
			if !strings.HasPrefix(r.URL.Path, "/api/") {
				next.ServeHTTP(w, r)
				return
			}

			if cfg.Disabled || cfg.SecretKey == "" {
				next.ServeHTTP(w, r.WithContext(WithUserID(r.Context(), cfg.DevUserID)))
				return
			}

			if clerkMW == nil {
				writeUnauthorized(w)
				return
			}

			clerkMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				claims, ok := clerk.SessionClaimsFromContext(r.Context())
				if !ok || claims == nil || claims.Subject == "" {
					writeUnauthorized(w)
					return
				}
				userID := claims.Subject

				if cfg.Store != nil {
					name, email, avatar := profileFromSession(r.Context(), userID)
					_ = cfg.Store.UpsertUserFromClerk(r.Context(), userID, name, email, avatar)
				}

				next.ServeHTTP(w, r.WithContext(WithUserID(r.Context(), userID)))
			})).ServeHTTP(w, r)
		})
	}
}

func profileFromSession(ctx context.Context, userID string) (name, email, avatar string) {
	u, err := user.Get(ctx, userID)
	if err != nil || u == nil {
		return "", "", ""
	}
	if u.FirstName != nil || u.LastName != nil {
		parts := []string{}
		if u.FirstName != nil {
			parts = append(parts, *u.FirstName)
		}
		if u.LastName != nil {
			parts = append(parts, *u.LastName)
		}
		name = strings.TrimSpace(strings.Join(parts, " "))
	}
	if u.Username != nil && name == "" {
		name = *u.Username
	}
	if len(u.EmailAddresses) > 0 && u.EmailAddresses[0] != nil {
		email = u.EmailAddresses[0].EmailAddress
	}
	if u.ImageURL != nil {
		avatar = *u.ImageURL
	}
	return name, email, avatar
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "unauthorized"})
}
