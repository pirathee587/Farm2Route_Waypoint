package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

type contextKey string

const (
	UserIDKey    contextKey = "user_id"
	UserRoleKey  contextKey = "user_role"
	UserEmailKey contextKey = "user_email"
)

// UserContext holds verified identity info passed by API Gateway
type UserContext struct {
	UserID uuid.UUID
	Role   string
	Email  string
}

// GetUserFromContext retrieves authenticated gateway user from request context
func GetUserFromContext(ctx context.Context) (*UserContext, bool) {
	uid, okID := ctx.Value(UserIDKey).(uuid.UUID)
	role, okRole := ctx.Value(UserRoleKey).(string)
	email, _ := ctx.Value(UserEmailKey).(string)

	if !okID || !okRole {
		return nil, false
	}
	return &UserContext{
		UserID: uid,
		Role:   role,
		Email:  email,
	}, true
}

// GatewayAuthMiddleware validates that incoming requests were forwarded by the API Gateway
// Checks X-Gateway-Verified: true and extracts user metadata headers
func GatewayAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		verified := r.Header.Get("X-Gateway-Verified")
		if strings.ToLower(strings.TrimSpace(verified)) != "true" {
			appErr := model.NewAppError(
				model.ErrCodeGatewayUnverified,
				"Unauthorized: missing or invalid gateway verification header",
				http.StatusUnauthorized,
			)
			appErr.WriteJSON(w)
			return
		}

		userIDStr := strings.TrimSpace(r.Header.Get("X-User-Id"))
		role := strings.ToUpper(strings.TrimSpace(r.Header.Get("X-User-Role")))
		email := strings.TrimSpace(r.Header.Get("X-User-Email"))

		if userIDStr == "" || role == "" {
			appErr := model.NewAppError(
				model.ErrCodeUnauthorized,
				"Unauthorized: missing required gateway user identity headers",
				http.StatusUnauthorized,
			)
			appErr.WriteJSON(w)
			return
		}

		userUUID, err := uuid.Parse(userIDStr)
		if err != nil {
			appErr := model.NewAppError(
				model.ErrCodeUnauthorized,
				"Unauthorized: invalid user ID format in gateway headers",
				http.StatusUnauthorized,
			)
			appErr.WriteJSON(w)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userUUID)
		ctx = context.WithValue(ctx, UserRoleKey, role)
		ctx = context.WithValue(ctx, UserEmailKey, email)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireLoaderOrDispatcher restricts access to LOADER (full access) or DISPATCHER (read-only)
func RequireLoaderOrDispatcher(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := GetUserFromContext(r.Context())
		if !ok {
			model.ErrUnauthorized("User identity not found in context").WriteJSON(w)
			return
		}

		switch user.Role {
		case "LOADER", "ADMIN":
			// Full access
			next.ServeHTTP(w, r)
		case "DISPATCHER":
			// Read-only access
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
			} else {
				appErr := model.NewAppError(
					model.ErrCodeForbidden,
					"Forbidden: Dispatcher has read-only access to loader operations",
					http.StatusForbidden,
				)
				appErr.WriteJSON(w)
			}
		default:
			appErr := model.NewAppError(
				model.ErrCodeForbidden,
				"Forbidden: Loader or Dispatcher role required",
				http.StatusForbidden,
			)
			appErr.WriteJSON(w)
		}
	})
}

// RequireDriver restricts driver portal APIs to gateway-verified DRIVER users.
func RequireDriver(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := GetUserFromContext(r.Context())
		if !ok {
			model.ErrUnauthorized("User identity not found in context").WriteJSON(w)
			return
		}
		if user.Role != "DRIVER" {
			model.ErrForbidden("Forbidden: Driver role required").WriteJSON(w)
			return
		}
		next.ServeHTTP(w, r)
	})
}
