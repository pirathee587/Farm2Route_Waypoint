package service

import (
	"context"
	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"math"
	"strconv"
	"time"
)

type ProfileDataRepository interface {
	GetProfile(context.Context, uuid.UUID) (model.DriverProfileRecord, error)
	Heartbeat(context.Context, uuid.UUID, time.Time, int) error
	Location(context.Context, uuid.UUID, model.LocationUpdateRequest, time.Time) error
	History(context.Context, uuid.UUID, time.Time, time.Time, int, int) ([]model.HistoryTrip, int, error)
}
type ProfileService struct {
	repo     ProfileDataRepository
	now      func() time.Time
	location *time.Location
}

func NewProfileService(repo ProfileDataRepository) *ProfileService {
	loc, err := time.LoadLocation("Asia/Colombo")
	if err != nil {
		loc = time.FixedZone("Asia/Colombo", 19800)
	}
	return &ProfileService{repo: repo, now: time.Now, location: loc}
}
func (s *ProfileService) Profile(ctx context.Context, id uuid.UUID) (*model.DriverProfileResponse, error) {
	x, err := s.repo.GetProfile(ctx, id)
	if err != nil {
		return nil, err
	}
	status := "OFFLINE"
	if x.LastSeenAt != nil && s.now().Sub(*x.LastSeenAt) <= 2*time.Minute {
		status = "ONLINE"
	}
	if x.LastSyncedAt != nil {
		v := x.LastSyncedAt.In(s.location)
		x.LastSyncedAt = &v
	}
	return &model.DriverProfileResponse{Driver: x.Driver, Vehicle: x.Vehicle, Connection: model.ProfileConnection{Status: status, LastSyncedAt: x.LastSyncedAt}, OfflineQueueCount: x.PendingActionsCount}, nil
}
func (s *ProfileService) Heartbeat(ctx context.Context, id uuid.UUID, request model.HeartbeatRequest) (*model.HeartbeatResponse, error) {
	if request.ClientTime.IsZero() {
		return nil, model.ErrBadRequest("client_time is required")
	}

	func (s *ProfileService) Location(ctx context.Context, id uuid.UUID, request model.LocationUpdateRequest) (*model.LocationUpdateResponse, error) {
		if request.Latitude < -90 || request.Latitude > 90 || request.Longitude < -180 || request.Longitude > 180 {
			return nil, model.ErrBadRequest("latitude or longitude is out of range")
		}
		if request.AccuracyMeters < 0 || request.AccuracyMeters > 10000 {
			return nil, model.ErrBadRequest("accuracy_meters must be between 0 and 10000")
		}
		recordedAt := s.now()
		if err := s.repo.Location(ctx, id, request, recordedAt); err != nil {
			return nil, err
		}
		return &model.LocationUpdateResponse{RecordedAt: recordedAt.In(s.location)}, nil
	}
	if request.PendingActionsCount < 0 {
		return nil, model.ErrBadRequest("pending_actions_count must not be negative")
	}
	server := s.now()
	if err := s.repo.Heartbeat(ctx, id, server, request.PendingActionsCount); err != nil {
		return nil, err
	}
	return &model.HeartbeatResponse{ServerTime: server.In(s.location), ClockSkewSeconds: int64(math.Round(server.Sub(request.ClientTime).Seconds()))}, nil
}
func (s *ProfileService) History(ctx context.Context, id uuid.UUID, fromValue, toValue, pageValue string) (*model.HistoryResponse, error) {
	today := s.now().In(s.location)
	to := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, s.location)
	from := to.AddDate(0, 0, -6)
	var err error
	if fromValue != "" {
		from, err = time.ParseInLocation("2006-01-02", fromValue, s.location)
		if err != nil {
			return nil, model.ErrBadRequest("from must use YYYY-MM-DD format")
		}
	}
	if toValue != "" {
		to, err = time.ParseInLocation("2006-01-02", toValue, s.location)
		if err != nil {
			return nil, model.ErrBadRequest("to must use YYYY-MM-DD format")
		}
	}
	if from.After(to) {
		return nil, model.ErrBadRequest("from must not be after to")
	}
	if int(to.Sub(from).Hours()/24)+1 > 31 {
		return nil, model.ErrBadRequest("history date range must not exceed 31 days")
	}
	page := 1
	if pageValue != "" {
		page, err = strconv.Atoi(pageValue)
		if err != nil || page < 1 {
			return nil, model.ErrBadRequest("page must be a positive integer")
		}
	}
	const pageSize = 10
	trips, total, err := s.repo.History(ctx, id, from, to, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &model.HistoryResponse{Trips: trips, Page: page, PageSize: pageSize, Total: total}, nil
}
