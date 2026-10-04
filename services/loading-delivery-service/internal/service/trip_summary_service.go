package service

import (
	"context"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

type TripSummaryData interface {
	Summary(context.Context, uuid.UUID, uuid.UUID) (model.TripSummary, error)
	Outcomes(context.Context, uuid.UUID, uuid.UUID, int, int) ([]model.TripOutcome, int, error)
	Complete(context.Context, uuid.UUID, uuid.UUID, time.Time) (model.TripSummary, error)
}
type TripSummaryService struct {
	repo TripSummaryData
	now  func() time.Time
}

func NewTripSummaryService(r TripSummaryData) *TripSummaryService {
	return &TripSummaryService{repo: r, now: time.Now}
}
func deriveCompletion(x *model.TripSummary) {
	done := x.Delivered + x.NotDelivered + x.Partial
	if x.TotalStops > 0 {
		x.CompletionPercent = (done*100 + x.TotalStops/2) / x.TotalStops
	}
	if x.CompletionPercent > 100 {
		x.CompletionPercent = 100
	}
}
func (s *TripSummaryService) Summary(ctx context.Context, driver, trip uuid.UUID) (*model.TripSummary, error) {
	x, err := s.repo.Summary(ctx, driver, trip)
	if err != nil {
		return nil, err
	}
	deriveCompletion(&x)
	return &x, nil
}
func (s *TripSummaryService) Outcomes(ctx context.Context, driver, trip uuid.UUID, pageRaw string) (*model.TripOutcomePage, error) {
	page := 1
	var err error
	if pageRaw != "" {
		page, err = strconv.Atoi(pageRaw)
		if err != nil || page < 1 {
			return nil, model.ErrBadRequest("page must be a positive integer")
		}
	}
	items, total, err := s.repo.Outcomes(ctx, driver, trip, page, 20)
	if err != nil {
		return nil, err
	}
	pages := (total + 19) / 20
	return &model.TripOutcomePage{Items: items, Page: page, PageSize: 20, Total: total, TotalPages: pages}, nil
}
func (s *TripSummaryService) Complete(ctx context.Context, driver, trip uuid.UUID) (*model.TripSummary, error) {
	x, err := s.repo.Complete(ctx, driver, trip, s.now())
	if err != nil {
		return nil, err
	}
	deriveCompletion(&x)
	return &x, nil
}
