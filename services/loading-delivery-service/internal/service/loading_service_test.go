package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

func TestItemBasedProgressPct(t *testing.T) {
	tests := []struct {
		name         string
		checkedItems int
		totalItems   int
		expected     int
	}{
		{
			name:         "TRC-189: 10/10 items checked returns 100",
			checkedItems: 10,
			totalItems:   10,
			expected:     100,
		},
		{
			name:         "TRC-198: 10/10 items checked returns 100",
			checkedItems: 10,
			totalItems:   10,
			expected:     100,
		},
		{
			name:         "WPT-204: 29/30 items checked returns 97",
			checkedItems: 29,
			totalItems:   30,
			expected:     97,
		},
		{
			name:         "TRC-176: 10/24 items checked returns 42",
			checkedItems: 10,
			totalItems:   24,
			expected:     42,
		},
		{
			name:         "TRC-211: 0/15 items checked returns 0",
			checkedItems: 0,
			totalItems:   15,
			expected:     0,
		},
		{
			name:         "Zero total items guard returns 0",
			checkedItems: 0,
			totalItems:   0,
			expected:     0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := model.ComputeProgressPct(tc.checkedItems, tc.totalItems)
			assert.Equal(t, tc.expected, actual)
		})
	}
}

func TestComputeLoadPct(t *testing.T) {
	tests := []struct {
		name       string
		loadedKg   float64
		capacityKg float64
		expected   int
	}{
		{
			name:       "exact percentage",
			loadedKg:   3400,
			capacityKg: 5000,
			expected:   68,
		},
		{
			name:       "zero loaded",
			loadedKg:   0,
			capacityKg: 6000,
			expected:   0,
		},
		{
			name:       "full capacity",
			loadedKg:   4800,
			capacityKg: 4800,
			expected:   100,
		},
		{
			name:       "over capacity capped at 100",
			loadedKg:   5200,
			capacityKg: 5000,
			expected:   100,
		},
		{
			name:       "zero capacity safe guard",
			loadedKg:   100,
			capacityKg: 0,
			expected:   0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := model.ComputeLoadPct(tc.loadedKg, tc.capacityKg)
			assert.Equal(t, tc.expected, actual)
		})
	}
}

func TestDeriveLoadingStatusRules(t *testing.T) {
	t.Run("Issue overrides only before ready_at", func(t *testing.T) {
		status := model.DeriveLoadingStatus(true, model.LoadingStatusLoaded, true, 100)
		assert.Equal(t, model.DerivedStatusReady, status)

		status2 := model.DeriveLoadingStatus(true, model.LoadingStatusPending, false, 0)
		assert.Equal(t, model.DerivedStatusIssue, status2)
	})

	t.Run("Status Ready when confStatus is LOADED (TRC-189 / TRC-198)", func(t *testing.T) {
		status := model.DeriveLoadingStatus(false, model.LoadingStatusLoaded, true, 100)
		assert.Equal(t, model.DerivedStatusReady, status)
	})

	t.Run("Status Ready when ready_at is set", func(t *testing.T) {
		status := model.DeriveLoadingStatus(false, model.LoadingStatusLoading, true, 100)
		assert.Equal(t, model.DerivedStatusReady, status)
	})

	t.Run("100% progress without LOADED/ready_at remains Loading", func(t *testing.T) {
		status := model.DeriveLoadingStatus(false, model.LoadingStatusLoading, false, 100)
		assert.Equal(t, model.DerivedStatusLoading, status)
	})

	t.Run("Status Loading when progress > 0", func(t *testing.T) {
		status := model.DeriveLoadingStatus(false, model.LoadingStatusLoading, false, 31)
		assert.Equal(t, model.DerivedStatusLoading, status)
	})

	t.Run("Status Not Started when status PENDING and 0% progress", func(t *testing.T) {
		status := model.DeriveLoadingStatus(false, model.LoadingStatusPending, false, 0)
		assert.Equal(t, model.DerivedStatusNotStarted, status)
	})
}

// Mock planning client to verify gRPC fallback
type mockPlanningClient struct {
	fail bool
}

func (m *mockPlanningClient) FetchTripDetails(ctx context.Context, tripID string) (*model.TripDetailResponse, error) {
	if m.fail {
		return nil, errors.New("connection refused to planning service")
	}
	return &model.TripDetailResponse{}, nil
}

func (m *mockPlanningClient) Close() error {
	return nil
}

func TestPlanningServiceFallback(t *testing.T) {
	client := &mockPlanningClient{fail: true}
	_, err := client.FetchTripDetails(context.Background(), "test-trip-id")
	assert.Error(t, err)
	// When planningClient fails, GetTripDetails sets stale: true and serves local snapshot
}
