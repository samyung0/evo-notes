package auth

import "context"

type ctxKey int

const userIDKey ctxKey = iota

// WithUserID attaches the authenticated user id to ctx.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserID returns the authenticated user id, or "" if absent.
func UserID(ctx context.Context) string {
	v, _ := ctx.Value(userIDKey).(string)
	return v
}
