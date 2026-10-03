package service_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

func TestValidatePhotoBytes(t *testing.T) {
	t.Run("Valid JPEG magic bytes", func(t *testing.T) {
		jpegData := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
		contentType, err := service.ValidatePhotoBytes(jpegData)
		require.NoError(t, err)
		assert.Equal(t, "image/jpeg", contentType)
	})

	t.Run("Valid PNG magic bytes", func(t *testing.T) {
		pngData := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
		contentType, err := service.ValidatePhotoBytes(pngData)
		require.NoError(t, err)
		assert.Equal(t, "image/png", contentType)
	})

	t.Run("Invalid file format (text/plain)", func(t *testing.T) {
		txtData := []byte("This is just plain text, not an image!")
		_, err := service.ValidatePhotoBytes(txtData)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid image format")
	})

	t.Run("Empty photo is allowed", func(t *testing.T) {
		contentType, err := service.ValidatePhotoBytes([]byte{})
		require.NoError(t, err)
		assert.Empty(t, contentType)
	})

	t.Run("Exceeds 10MB limit", func(t *testing.T) {
		oversized := make([]byte, 10*1024*1024+1)
		copy(oversized, []byte{0xFF, 0xD8, 0xFF})
		_, err := service.ValidatePhotoBytes(oversized)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "exceeds maximum allowed size")
	})
}

func TestWeightDeltaMath(t *testing.T) {
	// Highland milk crates: expected 24 crates, total weight 384 kg
	expectedQty := 24
	itemWeightKg := 384.00

	t.Run("2 crates short-shipped produces 32 kg delta", func(t *testing.T) {
		qtyAffected := 2
		delta := (itemWeightKg / float64(expectedQty)) * float64(qtyAffected)
		assert.Equal(t, 32.0, delta)
	})

	t.Run("All 24 crates missing produces 384 kg delta", func(t *testing.T) {
		qtyAffected := 24
		delta := (itemWeightKg / float64(expectedQty)) * float64(qtyAffected)
		assert.Equal(t, 384.0, delta)
	})

	t.Run("1 crate damaged produces 16 kg delta", func(t *testing.T) {
		qtyAffected := 1
		delta := (itemWeightKg / float64(expectedQty)) * float64(qtyAffected)
		assert.Equal(t, 16.0, delta)
	})
}

func TestQtyBounds(t *testing.T) {
	expectedQty := 24

	isValid := func(qty int) bool {
		return qty >= 1 && qty <= expectedQty
	}

	assert.False(t, isValid(0), "0 affected should be invalid")
	assert.False(t, isValid(-5), "Negative affected should be invalid")
	assert.True(t, isValid(1), "1 affected should be valid")
	assert.True(t, isValid(2), "2 affected should be valid")
	assert.True(t, isValid(24), "All 24 affected should be valid")
	assert.False(t, isValid(25), "25 affected (exceeds expected) should be invalid")
}
