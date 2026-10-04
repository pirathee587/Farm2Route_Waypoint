package service

import (
	"context"
	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"strconv"
	"time"
)

type NotificationDataRepository interface {
	Today(context.Context, uuid.UUID, time.Time) ([]model.DriverNotification, int, error)
	Review(context.Context, uuid.UUID, uuid.UUID, time.Time) error
	ReadAll(context.Context, uuid.UUID, time.Time) error
	History(context.Context, uuid.UUID, time.Time, time.Time, int, int) ([]model.DriverNotification, int, error)
}
type DriverNotificationService struct {
	repo     NotificationDataRepository
	now      func() time.Time
	location *time.Location
}

func NewDriverNotificationService(repo NotificationDataRepository) *DriverNotificationService {
	loc, err := time.LoadLocation("Asia/Colombo")
	if err != nil {
		loc = time.FixedZone("Asia/Colombo", 19800)
	}
	return &DriverNotificationService{repo: repo, now: time.Now, location: loc}
}
func (s *DriverNotificationService) Today(ctx context.Context, id uuid.UUID) (*model.DriverNotificationsResponse, error) {
	items, unread, err := s.repo.Today(ctx, id, s.now().In(s.location))
	if err != nil {
		return nil, err
	}
	response := &model.DriverNotificationsResponse{UnreadCount: unread, Items: []model.DriverNotification{}}
	for i := range items {
		items[i].CreatedAt = items[i].CreatedAt.In(s.location)
		if items[i].Type == "ROUTE_UPDATED" && !items[i].IsRead {
			response.PinnedCount++
			if response.Pinned == nil {
				x := items[i]
				response.Pinned = &x
				continue
			}
		}
		response.Items = append(response.Items, items[i])
	}
	return response, nil
}
func (s *DriverNotificationService) Review(ctx context.Context, driverID, notificationID uuid.UUID) error {
	return s.repo.Review(ctx, driverID, notificationID, s.now())
}
func (s *DriverNotificationService) ReadAll(ctx context.Context, driverID uuid.UUID) error {
	return s.repo.ReadAll(ctx, driverID, s.now())
}
func (s *DriverNotificationService) History(ctx context.Context, id uuid.UUID, fromValue, toValue, pageValue string) (*model.NotificationHistoryResponse, error) {
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
	if from.After(to) || int(to.Sub(from).Hours()/24)+1 > 31 {
		return nil, model.ErrBadRequest("notification history range must be between 1 and 31 days")
	}
	page := 1
	if pageValue != "" {
		page, err = strconv.Atoi(pageValue)
		if err != nil || page < 1 {
			return nil, model.ErrBadRequest("page must be a positive integer")
		}
	}
	const size = 20
	items, total, err := s.repo.History(ctx, id, from, to, page, size)
	if err != nil {
		return nil, err
	}
	for i := range items {
		items[i].CreatedAt = items[i].CreatedAt.In(s.location)
	}
	return &model.NotificationHistoryResponse{Items: items, Page: page, PageSize: size, Total: total}, nil
}
