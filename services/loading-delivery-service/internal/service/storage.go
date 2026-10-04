package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

const (
	MaxPhotoSizeBytes = 10 * 1024 * 1024 // 10MB
)

var (
	jpegMagicBytes = []byte{0xFF, 0xD8, 0xFF}
	pngMagicBytes  = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
)

// ValidatePhotoBytes verifies that the photo is a valid JPEG or PNG within 10MB
func ValidatePhotoBytes(data []byte) (string, error) {
	if len(data) == 0 {
		return "", nil
	}
	if len(data) > MaxPhotoSizeBytes {
		return "", model.ErrBadRequest("Photo exceeds maximum allowed size of 10MB")
	}

	if bytes.HasPrefix(data, jpegMagicBytes) {
		return "image/jpeg", nil
	}
	if bytes.HasPrefix(data, pngMagicBytes) {
		return "image/png", nil
	}

	return "", model.ErrBadRequest("Invalid image format: photo must be a valid JPG or PNG image")
}
func ValidatePODImage(data []byte) (string, error) {
	if len(data) == 0 {
		return "", model.ErrBadRequest("image is required")
	}
	if len(data) > 5*1024*1024 {
		return "", model.ErrBadRequest("Image exceeds maximum allowed size of 5MB")
	}
	if bytes.HasPrefix(data, jpegMagicBytes) {
		return "image/jpeg", nil
	}
	if bytes.HasPrefix(data, pngMagicBytes) {
		return "image/png", nil
	}
	return "", model.ErrBadRequest("Invalid image format: image must be a valid JPG or PNG image")
}

// StorageService defines the photo upload contract
type StorageService interface {
	UploadShortfallPhoto(ctx context.Context, originalFilename string, data []byte, contentType string) (string, error)
	UploadPOD(ctx context.Context, stopID, podType, originalFilename string, data []byte, contentType string) (string, error)
}

func (s *LocalStorageService) UploadPOD(ctx context.Context, stopID, podType, originalFilename string, data []byte, contentType string) (string, error) {
	return s.UploadShortfallPhoto(ctx, originalFilename, data, contentType)
}

// LocalStorageService stores images on the local disk
type LocalStorageService struct {
	baseDir string
	baseURL string
}

func NewLocalStorageService(baseDir, baseURL string) (*LocalStorageService, error) {
	if baseDir == "" {
		baseDir = "uploads/shortfalls"
	}
	if baseURL == "" {
		baseURL = "/uploads/shortfalls"
	}
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory %s: %w", baseDir, err)
	}
	return &LocalStorageService{
		baseDir: baseDir,
		baseURL: baseURL,
	}, nil
}

func (s *LocalStorageService) UploadShortfallPhoto(ctx context.Context, originalFilename string, data []byte, contentType string) (string, error) {
	if len(data) == 0 {
		return "", nil
	}

	ext := ".jpg"
	if strings.HasSuffix(strings.ToLower(originalFilename), ".png") || contentType == "image/png" {
		ext = ".png"
	}

	uniqueName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	targetPath := filepath.Join(s.baseDir, uniqueName)

	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to save photo locally: %w", err)
	}

	return fmt.Sprintf("%s/%s", strings.TrimSuffix(s.baseURL, "/"), uniqueName), nil
}

// SupabaseStorageService uploads images to Supabase Storage pod-images bucket
type SupabaseStorageService struct {
	bucketURL  string
	serviceKey string
}

func NewSupabaseStorageService(bucketURL string) *SupabaseStorageService {
	return &SupabaseStorageService{bucketURL: bucketURL, serviceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY")}
}
func (s *SupabaseStorageService) UploadPOD(ctx context.Context, stopID, podType, originalFilename string, data []byte, contentType string) (string, error) {
	ext := ".jpg"
	if contentType == "image/png" {
		ext = ".png"
	}
	object := fmt.Sprintf("pod/%s/%s/%s%s", stopID, strings.ToLower(podType), uuid.NewString(), ext)
	endpoint := fmt.Sprintf("%s/storage/v1/object/pod-images/%s", strings.TrimSuffix(s.bucketURL, "/"), object)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("x-upsert", "false")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("supabase storage upload: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return "", fmt.Errorf("supabase storage upload failed: %s: %s", resp.Status, string(body))
	}
	return "pod-images/" + object, nil
}

func (s *SupabaseStorageService) UploadShortfallPhoto(ctx context.Context, originalFilename string, data []byte, contentType string) (string, error) {
	if len(data) == 0 {
		return "", nil
	}
	ext := ".jpg"
	if strings.HasSuffix(strings.ToLower(originalFilename), ".png") || contentType == "image/png" {
		ext = ".png"
	}
	uniqueName := fmt.Sprintf("shortfalls/%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	// Return bucket path
	return fmt.Sprintf("pod-images/%s", uniqueName), nil
}

func NewStorageServiceFromEnv() StorageService {
	mode := strings.ToLower(os.Getenv("STORAGE_MODE"))
	if mode == "supabase" {
		return NewSupabaseStorageService(os.Getenv("SUPABASE_URL"))
	}
	local, _ := NewLocalStorageService("uploads/shortfalls", "/uploads/shortfalls")
	return local
}
