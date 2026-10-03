package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// responseWriterWrapper wraps http.ResponseWriter to capture the status code
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// RequestLogger returns an HTTP middleware that performs structured logging via slog
func RequestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			wrapper := &responseWriterWrapper{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			next.ServeHTTP(wrapper, r)

			duration := time.Since(start)

			attrs := []any{
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", wrapper.statusCode),
				slog.Int64("duration_ms", duration.Milliseconds()),
				slog.String("remote_addr", r.RemoteAddr),
				slog.String("user_agent", r.UserAgent()),
			}

			if user, ok := GetUserFromContext(r.Context()); ok {
				attrs = append(attrs,
					slog.String("user_id", user.UserID.String()),
					slog.String("user_role", user.Role),
				)
			}

			if wrapper.statusCode >= 500 {
				logger.Error("HTTP request failed", attrs...)
			} else if wrapper.statusCode >= 400 {
				logger.Warn("HTTP client error", attrs...)
			} else {
				logger.Info("HTTP request processed", attrs...)
			}
		})
	}
}
