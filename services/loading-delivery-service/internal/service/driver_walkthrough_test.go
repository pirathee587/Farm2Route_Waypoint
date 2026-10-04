package service

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

// This service-boundary walkthrough keeps external PostgreSQL, RabbitMQ,
// Mapbox and Storage deterministic while following the same calls as the app.
func TestDriverWalkthroughEndToEnd(t *testing.T) {
	ctx, driver, stop := context.Background(), uuid.New(), uuid.New()
	pod, confirm := podFixture()
	repo := &fakeDriverRepo{stop: model.DriverStopDetailRecord{CanArrive: true, OutletID: "OUT027", OutletName: "Style Mall Outlet"}, pod: pod, arrivalRecord: model.ArrivalRecord{WindowOpensAt: time.Date(2026, 10, 4, 9, 30, 0, 0, time.Local), WindowClosesAt: time.Date(2026, 10, 4, 10, 0, 0, 0, time.Local)}}
	driverService := NewDriverService(repo)
	early := time.Date(2026, 10, 4, 9, 12, 0, 0, time.Local)
	driverService.now = func() time.Time { return early }

	today, err := driverService.Today(ctx, driver, early)
	require.NoError(t, err)
	require.Len(t, today.Trips, 1)
	_, err = driverService.StopDetail(ctx, driver, stop)
	require.NoError(t, err)
	arrival, err := driverService.Arrive(ctx, driver, stop, model.ArriveRequest{ClientActionID: uuid.NewString(), ArrivedAt: &early})
	require.NoError(t, err)
	require.Equal(t, "WAITING_FOR_WINDOW", arrival.Status)

	confirm.Shortfalls = []model.ConfirmShortfall{{ItemID: pod.Items[1].ItemID, Qty: 2, Type: "shortage", Note: "Bread short 2"}}
	confirm.Items[1].DeliveredQty -= 2
	delivered, err := driverService.ConfirmDelivery(ctx, driver, stop, confirm)
	require.NoError(t, err)
	require.Equal(t, "PARTIAL", delivered.Outcome)
	reported := early.Add(time.Hour)
	issue, err := driverService.CantDeliver(ctx, driver, uuid.New(), model.CantDeliverRequest{ClientActionID: uuid.NewString(), Reason: "access_denied", ReportedAt: &reported})
	require.NoError(t, err)
	require.Equal(t, "NOT_DELIVERED", issue.Status)

	syncService, syncRepo, _, syncDriver, syncStop, now := syncFixture()
	synced, err := syncService.Sync(ctx, syncDriver, model.SyncRequest{Actions: []model.SyncAction{{ClientActionID: uuid.NewString(), Type: "ARRIVAL", StopID: syncStop.String(), ClientTimestamp: now.Add(-time.Minute), Payload: json.RawMessage(`{}`)}}})
	require.NoError(t, err)
	require.Equal(t, 1, synced.SyncedCount)
	require.True(t, syncRepo.finished)

	notifications, err := NewDriverNotificationService(&fakeNotificationRepo{unread: 1, items: []model.DriverNotification{{Type: "DELIVERY_WINDOW_OPEN"}}}).Today(ctx, driver)
	require.NoError(t, err)
	require.Equal(t, 1, notifications.UnreadCount)
	summary, err := NewTripSummaryService(&fakeTripSummaryRepo{summary: model.TripSummary{TotalStops: 2, Partial: 1, NotDelivered: 1}}).Summary(ctx, driver, uuid.New())
	require.NoError(t, err)
	require.Equal(t, 100, summary.CompletionPercent)
}
