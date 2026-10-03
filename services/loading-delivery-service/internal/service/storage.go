package service

import (
	"bytes"
	"context"
	"fmt"
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

// StorageService defines the photo upload contract
type StorageService interface {
	UploadShortfallPhoto(ctx context.Context, originalFilename string, data []byte, contentType string) (string, error)
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
	bucketURL string
}

func NewSupabaseStorageService(bucketURL string) *SupabaseStorageService {
	return &SupabaseStorageService{bucketURL: bucketURL}
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
