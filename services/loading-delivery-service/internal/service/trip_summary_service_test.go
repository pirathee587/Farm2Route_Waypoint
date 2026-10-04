package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

type fakeTripSummaryRepo struct {
	summary                   model.TripSummary
	outcomes                  []model.TripOutcome
	total                     int
	summaryErr, errorComplete error
	completeCalls             int
}

func (f *fakeTripSummaryRepo) Summary(context.Context, uuid.UUID, uuid.UUID) (model.TripSummary, error) {
	return f.summary, f.summaryErr
}
func (f *fakeTripSummaryRepo) Outcomes(context.Context, uuid.UUID, uuid.UUID, int, int) ([]model.TripOutcome, int, error) {
	return f.outcomes, f.total, nil
}
func (f *fakeTripSummaryRepo) Complete(context.Context, uuid.UUID, uuid.UUID, time.Time) (model.TripSummary, error) {
	f.completeCalls++
	return f.summary, f.errorComplete
}

func TestTripSummaryCountsCompletionAndAttention(t *testing.T) {
	r := &fakeTripSummaryRepo{summary: model.TripSummary{
		TotalStops: 8, Delivered: 5, NotDelivered: 2, Partial: 1,
		AttentionRecords: []model.AttentionRecord{
			{Type: "access_denied", OutletID: "OUT027", Sent: false},
			{Type: "shortfall", OutletID: "OUT014", Detail: "Bread short 2", Sent: true},
			{Type: "conflict_review", Detail: "Delivered offline, removed by dispatcher - pending review"},
		},
	}}
	x, err := NewTripSummaryService(r).Summary(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
	require.Equal(t, 100, x.CompletionPercent)
	require.Equal(t, 8, x.Delivered+x.NotDelivered+x.Partial)
	require.Equal(t, "conflict_review", x.AttentionRecords[2].Type)
	require.False(t, x.AttentionRecords[0].Sent)
}
func TestTripSummaryRemovedExcludedAndRounded(t *testing.T) {
	r := &fakeTripSummaryRepo{summary: model.TripSummary{TotalStops: 7, Delivered: 2, NotDelivered: 1}}
	x, _ := NewTripSummaryService(r).Summary(context.Background(), uuid.New(), uuid.New())
	require.Equal(t, 43, x.CompletionPercent)
}
func TestTripOutcomesPagination(t *testing.T) {
	r := &fakeTripSummaryRepo{outcomes: make([]model.TripOutcome, 20), total: 41}
	x, err := NewTripSummaryService(r).Outcomes(context.Background(), uuid.New(), uuid.New(), "2")
	require.NoError(t, err)
	require.Equal(t, 3, x.TotalPages)
	_, err = NewTripSummaryService(r).Outcomes(context.Background(), uuid.New(), uuid.New(), "0")
	require.Equal(t, 400, err.(*model.AppError).Status)
}
func TestTripCompleteIncompleteIdempotentOwnershipAndUnknown(t *testing.T) {
	r := &fakeTripSummaryRepo{summary: model.TripSummary{Status: "COMPLETED", TotalStops: 1, Delivered: 1}}
	s := NewTripSummaryService(r)
	_, err := s.Complete(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
	_, err = s.Complete(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
	require.Equal(t, 2, r.completeCalls)
	for _, want := range []int{409, 403, 404} {
		r.errorComplete = model.NewAppError("TEST", "error", want)
		_, err = s.Complete(context.Background(), uuid.New(), uuid.New())
		require.Equal(t, want, err.(*model.AppError).Status)
	}
}
