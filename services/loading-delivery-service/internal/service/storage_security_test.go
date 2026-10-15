package service_test

import (
	"context"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/service"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func uploadContext(id uuid.UUID) context.Context {
	c := context.WithValue(context.Background(), middleware.UserIDKey, id)
	return context.WithValue(c, middleware.UserRoleKey, "LOADER")
}
func TestUploadPersistsAcrossStorageRestartAndEnforcesOwnership(t *testing.T) {
	dir := t.TempDir()
	owner := uuid.New()
	photo := []byte{0xff, 0xd8, 0xff, 0x00}
	first, err := service.NewLocalStorageService(dir, "")
	require.NoError(t, err)
	path, err := first.UploadShortfallPhoto(uploadContext(owner), "../../test.jpg", photo, "image/jpeg")
	require.NoError(t, err)
	restarted, err := service.NewLocalStorageService(dir, "")
	require.NoError(t, err)
	mux := http.NewServeMux()
	mux.Handle("GET /api/loading/uploads/{filename}", middleware.GatewayAuthMiddleware(restarted))
	for _, tt := range []struct {
		id   uuid.UUID
		role string
		code int
	}{{owner, "LOADER", 200}, {uuid.New(), "LOADER", 403}, {uuid.New(), "DISPATCHER", 200}} {
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", tt.id.String())
		req.Header.Set("X-User-Role", tt.role)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		require.Equal(t, tt.code, rec.Code)
		if tt.code == 200 {
			require.Equal(t, photo, rec.Body.Bytes())
		}
	}
	unauth := httptest.NewRecorder()
	mux.ServeHTTP(unauth, httptest.NewRequest("GET", path, nil))
	require.Equal(t, 401, unauth.Code)
	// A symlink cannot expose files outside the upload root.
	require.NoError(t, os.Symlink("/etc/passwd", filepath.Join(dir, "escape.jpg")))
	req := httptest.NewRequest("GET", "/api/loading/uploads/escape.jpg", nil).WithContext(uploadContext(owner))
	req.SetPathValue("filename", "escape.jpg")
	rec := httptest.NewRecorder()
	restarted.ServeHTTP(rec, req)
	require.Equal(t, 404, rec.Code)
}
func TestSupabaseShortfallActuallyUploads(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		require.Equal(t, "POST", r.Method)
		require.True(t, strings.HasPrefix(r.URL.Path, "/storage/v1/object/pod-images/pod/shortfall/"))
		w.WriteHeader(200)
	}))
	defer server.Close()
	storage := service.NewSupabaseStorageService(server.URL)
	_, err := storage.UploadShortfallPhoto(context.Background(), "photo.jpg", []byte{0xff, 0xd8, 0xff}, "image/jpeg")
	require.NoError(t, err)
	require.True(t, called)
}
func TestStorageMisconfigurationFailsClosed(t *testing.T) {
	t.Setenv("STORAGE_MODE", "unsupported")
	_, err := service.StorageServiceFromEnv()
	require.Error(t, err)
}
