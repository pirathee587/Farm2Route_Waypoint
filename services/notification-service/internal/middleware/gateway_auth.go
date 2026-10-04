// Package middleware provides HTTP middleware for the notification service.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/waypoint/notification-service/internal/model"
)

type contextKey string

const (
	userIDKey    contextKey = "user_id"
	userRoleKey  contextKey = "user_role"
	userEmailKey contextKey = "user_email"
)

// UserContext holds the authenticated user identity injected by the API Gateway.
type UserContext struct {
	UserID string
	Role   string
	Email  string
}

// GetUserFromContext retrieves the UserContext populated by GatewayAuthMiddleware.
func GetUserFromContext(ctx context.Context) (*UserContext, bool) {
	uid, okID := ctx.Value(userIDKey).(string)
	role, okRole := ctx.Value(userRoleKey).(string)
	email, _ := ctx.Value(userEmailKey).(string)
	if !okID || !okRole || uid == "" || role == "" {
		return nil, false
	}
	return &UserContext{UserID: uid, Role: role, Email: email}, true
}

// GatewayAuthMiddleware validates that the request was forwarded by the API Gateway
// (X-Gateway-Verified: true) and extracts user identity headers.
func GatewayAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		verified := strings.TrimSpace(r.Header.Get("X-Gateway-Verified"))
		if !strings.EqualFold(verified, "true") {
			model.ErrUnauthorized("Missing or invalid gateway verification header").WriteJSON(w)
			return
		}

		userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
		role := strings.ToUpper(strings.TrimSpace(r.Header.Get("X-User-Role")))
		email := strings.TrimSpace(r.Header.Get("X-User-Email"))

		if userID == "" || role == "" {
			model.ErrUnauthorized("Missing required gateway identity headers").WriteJSON(w)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, userRoleKey, role)
		ctx = context.WithValue(ctx, userEmailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequestLogger is a minimal structured request logging middleware.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Basic pass-through; full logging can be added via slog if needed.
		next.ServeHTTP(w, r)
	})
}
