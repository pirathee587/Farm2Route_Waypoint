package service

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	planningpb "github.com/waypoint/loading-delivery-service/internal/planningpb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// PlanningClientInterface defines gRPC client methods for planning-service
type PlanningClientInterface interface {
	FetchTripDetails(ctx context.Context, tripID string) (*PlanningTripSnapshot, error)
}

// PlanningTripSnapshot captures planning data retrieved from PlanningService.GetTrip
type PlanningTripSnapshot struct {
	TripID        string
	VehicleID     string
	DriverID      string
	TripNumber    int
	DeliveryDate  string
	Status        string
	StopSequence  []string
	TotalWeightKg float64
	TotalVolumeM3 float64
}

// PlanningServiceClient implements gRPC call to PlanningService.GetTrip with 2s timeout and 1 retry
type PlanningServiceClient struct {
	targetAddress string
	logger        *slog.Logger
	dialOptions   []grpc.DialOption
	timeout       time.Duration
}

func NewPlanningServiceClient(targetAddress string, logger *slog.Logger, dialOptions ...grpc.DialOption) *PlanningServiceClient {
	if targetAddress == "" {
		host := os.Getenv("PLANNING_GRPC_HOST")
		port := os.Getenv("PLANNING_GRPC_PORT")
		if host != "" && port != "" {
			targetAddress = host + ":" + port
		} else if port != "" {
			targetAddress = "localhost:" + port
		} else {
			// Real planning-service port is 9090 (from docker-compose / .env)
			targetAddress = "localhost:9090"
		}
	}
	return &PlanningServiceClient{
		targetAddress: targetAddress,
		logger:        logger,
		dialOptions:   dialOptions,
		timeout:       2 * time.Second,
	}
}

// SetTimeout allows tests to customize timeout
func (c *PlanningServiceClient) SetTimeout(t time.Duration) {
	c.timeout = t
}

// FetchTripDetails executes PlanningService.GetTrip with a 2-second timeout and 1 retry
func (c *PlanningServiceClient) FetchTripDetails(ctx context.Context, tripID string) (*PlanningTripSnapshot, error) {
	var lastErr error
	timeout := c.timeout
	if timeout <= 0 {
		timeout = 2 * time.Second
	}

	// Retry loop: max 2 attempts (initial attempt + 1 retry)
	for attempt := 1; attempt <= 2; attempt++ {
		callCtx, cancel := context.WithTimeout(ctx, timeout)

		dialOpts := []grpc.DialOption{
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		}
		if len(c.dialOptions) > 0 {
			dialOpts = append(dialOpts, c.dialOptions...)
		}

		conn, err := grpc.DialContext(callCtx, c.targetAddress, dialOpts...)
		if err != nil {
			cancel()
			lastErr = fmt.Errorf("attempt %d: failed to connect to planning-service at %s: %w", attempt, c.targetAddress, err)
			c.logger.Warn("gRPC connection attempt failed", "attempt", attempt, "error", err)
			continue
		}

		response, err := planningpb.NewPlanningServiceClient(conn).GetTrip(callCtx, &planningpb.GetTripRequest{TripId: tripID})
		conn.Close()
		cancel()

		if err != nil {
			lastErr = fmt.Errorf("attempt %d: gRPC call to PlanningService.GetTrip failed: %w", attempt, err)
			c.logger.Warn("gRPC PlanningService.GetTrip call failed", "attempt", attempt, "error", err)
			continue
		}

		trip := response.GetTrip()
		if trip == nil || trip.GetTripId() != tripID {
			return nil, fmt.Errorf("planning returned an empty or mismatched trip")
		}
		return &PlanningTripSnapshot{
			TripID: trip.GetTripId(), VehicleID: trip.GetVehicleId(), DriverID: trip.GetDriverId(),
			TripNumber: int(trip.GetTripNumber()), DeliveryDate: trip.GetDeliveryDate(), Status: trip.GetStatus(),
			StopSequence: trip.GetStopSequence(), TotalWeightKg: trip.GetTotalWeightKg(), TotalVolumeM3: trip.GetTotalVolumeM3(),
		}, nil
	}

	return nil, lastErr
}
