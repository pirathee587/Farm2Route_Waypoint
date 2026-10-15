package service_test

import (
	"context"
	planningpb "github.com/waypoint/loading-delivery-service/internal/planningpb"
	"io"
	"log/slog"
	"net"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
)

const bufSize = 1024 * 1024

func setupBufconnServer(t *testing.T, handler grpc.StreamHandler) (*bufconn.Listener, func()) {
	lis := bufconn.Listen(bufSize)
	s := grpc.NewServer(grpc.UnknownServiceHandler(handler))

	go func() {
		if err := s.Serve(lis); err != nil && err != grpc.ErrServerStopped {
			// server stopped
		}
	}()

	cleanup := func() {
		s.Stop()
		_ = lis.Close()
	}
	return lis, cleanup
}

func TestPlanningClient_Bufconn_Success(t *testing.T) {
	// Handler that returns success
	handler := func(srv interface{}, stream grpc.ServerStream) error {
		var req planningpb.GetTripRequest
		if err := stream.RecvMsg(&req); err != nil {
			return err
		}
		return stream.SendMsg(&planningpb.GetTripResponse{Trip: &planningpb.Trip{TripId: req.TripId, VehicleId: "VEH-1", DriverId: "driver", TripNumber: 2, DeliveryDate: "2026-10-14", Status: "CONFIRMED", StopSequence: []string{"OUT-1"}, TotalWeightKg: 42, TotalVolumeM3: 3}})
	}

	lis, cleanup := setupBufconnServer(t, handler)
	defer cleanup()

	dialer := grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client := service.NewPlanningServiceClient("bufnet", logger, dialer)
	client.SetTimeout(1 * time.Second)

	snapshot, err := client.FetchTripDetails(context.Background(), "20400000-0000-0000-0000-000000000204")
	require.NoError(t, err)
	require.NotNil(t, snapshot)
	assert.Equal(t, "20400000-0000-0000-0000-000000000204", snapshot.TripID)
	assert.Equal(t, "VEH-1", snapshot.VehicleID)
	assert.Equal(t, 2, snapshot.TripNumber)
	assert.Equal(t, 42.0, snapshot.TotalWeightKg)
	assert.Equal(t, []string{"OUT-1"}, snapshot.StopSequence)
	assert.False(t, service.PlanningSnapshotStale(err), "successful bufconn call must produce stale=false")
}

func TestPlanningClient_Bufconn_TimeoutAndRetry(t *testing.T) {
	var attempts atomic.Int32
	// Handler that delays longer than client timeout
	handler := func(srv interface{}, stream grpc.ServerStream) error {
		attempts.Add(1)
		select {
		case <-time.After(300 * time.Millisecond):
			return nil
		case <-stream.Context().Done():
			return stream.Context().Err()
		}
	}

	lis, cleanup := setupBufconnServer(t, handler)
	defer cleanup()

	dialer := grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client := service.NewPlanningServiceClient("bufnet", logger, dialer)
	// Set very short timeout so test runs fast
	client.SetTimeout(50 * time.Millisecond)

	_, err := client.FetchTripDetails(context.Background(), "20400000-0000-0000-0000-000000000204")
	require.Error(t, err)
	// Verifies initial attempt + 1 retry = 2 attempts
	assert.Equal(t, int32(2), attempts.Load(), "Expected initial call plus 1 retry attempt")
}

func TestPlanningClient_Bufconn_Failure(t *testing.T) {
	// Handler that returns gRPC error
	handler := func(srv interface{}, stream grpc.ServerStream) error {
		return status.Error(codes.NotFound, "trip not planned yet")
	}

	lis, cleanup := setupBufconnServer(t, handler)
	defer cleanup()

	dialer := grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client := service.NewPlanningServiceClient("bufnet", logger, dialer)
	client.SetTimeout(500 * time.Millisecond)

	_, err := client.FetchTripDetails(context.Background(), "unknown-trip")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "trip not planned yet")
	assert.True(t, service.PlanningSnapshotStale(err), "failed bufconn call must produce stale=true")
}
