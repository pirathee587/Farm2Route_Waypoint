//go:build integration
// +build integration

package repository_test

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

// Copied from notification-service for testing outbox compatibility
type FlagRaisedEventTestShape struct {
	ShortfallRef   string `json:"shortfall_ref"`
	TripID         string `json:"trip_id"`
	TripCode       string `json:"trip_code"`
	ItemSKU        string `json:"item_sku"`
	ItemName       string `json:"item_name"`
	Reason         string `json:"reason"`
	ReportedByID   string `json:"reported_by_id"`
	CreatedAt      string `json:"created_at"`
	TargetOutletID string `json:"outlet_id"`
	TargetDriverID string `json:"driver_id"`
}

// LoadingCompletedEventTestShape is the shape for P7 integration test
type LoadingCompletedEventTestShape struct {
	TripID     string `json:"trip_id"`
	TripCode   string `json:"trip_code"`
	VehicleID  string `json:"vehicle_id"`
	DriverID   string `json:"driver_id"`
	ReadyAt    string `json:"ready_at"`
	ReadyByID  string `json:"ready_by_id"`
	IssueCount int    `json:"issue_count"`
}

func getTestPool(t *testing.T) *pgxpool.Pool {
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		dbURL = "postgres://postgres:postgrespassword@localhost:5433/waypoint_test?sslmode=disable"
	}

	cfg, err := pgxpool.ParseConfig(dbURL)
	require.NoError(t, err, "Failed to parse database connection URL")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	require.NoError(t, err, "Failed to create pgxpool")

	err = pool.Ping(ctx)
	require.NoError(t, err, "Failed to ping test database")

	err = repository.NewLoaderRepository(pool).ResetDemoState(ctx)
	require.NoError(t, err, "Failed to reset demo state before integration test")

	return pool
}

func TestIntegration_RouteResequenceAndDepotScope(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()
	ctx := context.Background()
	repo := repository.NewLoaderRepository(pool)
	tripID := uuid.MustParse("20400000-0000-0000-0000-000000000204")
	loaderID := uuid.MustParse("11111111-1111-1111-1111-111111111101")
	_, err := pool.Exec(ctx, `UPDATE public.plan_changes SET acknowledged=TRUE WHERE trip_id=$1`, tripID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE public.load_stops SET status='PENDING' WHERE trip_id=$1`, tripID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE public.loading_confirmations SET version=40 WHERE trip_id=$1`, tripID)
	require.NoError(t, err)
	before, err := repo.GetStopsByTripID(ctx, tripID)
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(before), 3)
	stopNos := map[uuid.UUID]int{}
	ids := make([]uuid.UUID, len(before))
	for i, s := range before {
		stopNos[s.StopID] = s.StopNo
		ids[len(before)-1-i] = s.StopID
	}
	err = repo.ResequenceRoute(ctx, tripID, ids, 40, loaderID)
	require.NoError(t, err)
	after, err := repo.GetStopsByTripID(ctx, tripID)
	require.NoError(t, err)
	for i, s := range after {
		assert.Equal(t, i+1, s.LoadOrder)
		assert.Equal(t, stopNos[s.StopID], s.StopNo, "delivery stop_no must not change")
	}
	err = repo.ResequenceRoute(ctx, tripID, ids, 40, loaderID)
	require.Error(t, err)
	var versionErr *model.AppError
	require.ErrorAs(t, err, &versionErr)
	assert.Equal(t, model.ErrCodeVersionConflict, versionErr.Code)
	err = repo.ResequenceRoute(ctx, tripID, []uuid.UUID{ids[0], ids[0]}, 41, loaderID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "every active trip stop")
	_, err = pool.Exec(ctx, `UPDATE public.load_stops SET status='LOADING' WHERE stop_id=$1`, ids[0])
	require.NoError(t, err)
	blocked := append([]uuid.UUID(nil), ids...)
	blocked[0], blocked[1] = blocked[1], blocked[0]
	err = repo.ResequenceRoute(ctx, tripID, blocked, 41, loaderID)
	require.Error(t, err)
	var appErr *model.AppError
	require.ErrorAs(t, err, &appErr)
	assert.Equal(t, model.ErrCodeStopAlreadyStarted, appErr.Code)
	var stopNoAfter int
	require.NoError(t, pool.QueryRow(ctx, `SELECT stop_no FROM public.load_stops WHERE stop_id=$1`, ids[0]).Scan(&stopNoAfter))
	assert.Equal(t, stopNos[ids[0]], stopNoAfter)
	var eventCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM public.outbox_events WHERE aggregate_id=$1 AND event_type='ROUTE_RESEQUENCED'`, tripID.String()).Scan(&eventCount))
	assert.GreaterOrEqual(t, eventCount, 1)
	peliyagoda, err := repo.FetchRawTripsForDateAndDepot(ctx, "", "Peliyagoda")
	require.NoError(t, err)
	require.NotEmpty(t, peliyagoda)
	for _, tr := range peliyagoda {
		assert.NotContains(t, strings.ToLower(tr.Depot), "kandy")
	}
	kandy, err := repo.FetchRawTripsForDateAndDepot(ctx, "", "Kandy")
	require.NoError(t, err)
	require.NotEmpty(t, kandy)
	for _, tr := range kandy {
		assert.Contains(t, strings.ToLower(tr.Depot), "kandy")
		assert.Equal(t, "Kandy DC", tr.Origin)
	}
	svc := service.NewLoadingService(nil, repo, nil, slog.Default())
	scoped, err := svc.GetTodayLoads(ctx, model.TripsFilter{Depot: "Kandy", Limit: 20})
	require.NoError(t, err)
	assert.Equal(t, "Kandy Distribution Center", scoped.Meta.Depot)
	require.Len(t, scoped.Trips, 1)
	assert.Equal(t, "Kandy DC", scoped.Trips[0].Origin)
}

func TestIntegration_ListTodayLoads(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	repo := repository.NewLoaderRepository(pool)
	ctx := context.Background()

	// Fetch the rolling CURRENT_DATE fixture.
	rawTrips, err := repo.FetchRawTripsForDate(ctx, "")
	require.NoError(t, err)
	require.NotEmpty(t, rawTrips, "expected seeded trips for CURRENT_DATE")

	// Map trips by VehicleID
	tripMap := make(map[string]repository.RawTripRecord)
	for _, tr := range rawTrips {
		tripMap[tr.VehicleID] = tr
	}

	// Verify TRC-189: 100% progress, Ready status
	trc189, exists := tripMap["TRC-189"]
	require.True(t, exists, "TRC-189 must exist in seeded trips")
	p189 := model.ComputeProgressPct(trc189.CheckedItems, trc189.TotalItems)
	st189 := model.DeriveLoadingStatus(trc189.HasOpenIssues, trc189.ConfStatus, trc189.HasReadyAt, p189)
	assert.Equal(t, 100, p189, "TRC-189 progress must be 100%")
	assert.Equal(t, model.DerivedStatusReady, st189, "TRC-189 status must be Ready")
	assert.Equal(t, "Negombo", trc189.Destination)

	// Verify TRC-198: 100% progress, Ready status
	trc198, exists := tripMap["TRC-198"]
	require.True(t, exists, "TRC-198 must exist in seeded trips")
	p198 := model.ComputeProgressPct(trc198.CheckedItems, trc198.TotalItems)
	st198 := model.DeriveLoadingStatus(trc198.HasOpenIssues, trc198.ConfStatus, trc198.HasReadyAt, p198)
	assert.Equal(t, 100, p198, "TRC-198 progress must be 100%")
	assert.Equal(t, model.DerivedStatusReady, st198, "TRC-198 status must be Ready")
	assert.Equal(t, "Kiribathgoda", trc198.Destination)

	// Verify TRC-176: 4 stops, 42% progress, Issue status (due to open issue flag SR-0481), destination "Nugegoda"
	trc176, exists := tripMap["TRC-176"]
	require.True(t, exists, "TRC-176 must exist in seeded trips")
	p176 := model.ComputeProgressPct(trc176.CheckedItems, trc176.TotalItems)
	st176 := model.DeriveLoadingStatus(trc176.HasOpenIssues, trc176.ConfStatus, trc176.HasReadyAt, p176)
	assert.Equal(t, 4, trc176.StopCount, "TRC-176 must have 4 stops")
	assert.Equal(t, 42, p176, "TRC-176 progress must be 42% (10 checked of 24 total items)")
	assert.Equal(t, model.DerivedStatusIssue, st176, "TRC-176 status must be Issue")
	assert.Equal(t, "Nugegoda", trc176.Destination, "TRC-176 destination area must be Nugegoda")

	// Verify TRC-204 (WPT-204): 97% progress, Loading status before a shortfall is reported
	trc204, exists := tripMap["TRC-204"]
	require.True(t, exists, "TRC-204 must exist in seeded trips")
	p204 := model.ComputeProgressPct(trc204.CheckedItems, trc204.TotalItems)
	st204 := model.DeriveLoadingStatus(trc204.HasOpenIssues, trc204.ConfStatus, trc204.HasReadyAt, p204)
	assert.Equal(t, 97, p204, "TRC-204 progress must be 97% (29/30 items checked)")
	assert.Equal(t, model.DerivedStatusLoading, st204, "TRC-204 status must be Loading")
	assert.Equal(t, "Union Place", trc204.Destination)

	// Verify TRC-211: 0% progress, Not Started status
	trc211, exists := tripMap["TRC-211"]
	require.True(t, exists, "TRC-211 must exist in seeded trips")
	p211 := model.ComputeProgressPct(trc211.CheckedItems, trc211.TotalItems)
	st211 := model.DeriveLoadingStatus(trc211.HasOpenIssues, trc211.ConfStatus, trc211.HasReadyAt, p211)
	assert.Equal(t, 0, p211, "TRC-211 progress must be 0%")
	assert.Equal(t, model.DerivedStatusNotStarted, st211, "TRC-211 status must be Not Started")
	assert.Equal(t, "Wattala", trc211.Destination)

	// Seed fidelity (all derived from load_items / load_stops rows)
	assert.Equal(t, 3, trc189.StopCount, "TRC-189 stop count")
	assert.Equal(t, 2, trc198.StopCount, "TRC-198 stop count")
	assert.Equal(t, 5, trc211.StopCount, "TRC-211 stop count")
	assert.InDelta(t, 1890.0, trc176.LoadedKg, 0.5, "TRC-176 loaded kg")

	trc220, exists := tripMap["TRC-220"]
	require.True(t, exists, "TRC-220 must exist")
	assert.Equal(t, 6, trc220.StopCount, "TRC-220 stop count")
	assert.Equal(t, 31, model.ComputeProgressPct(trc220.CheckedItems, trc220.TotalItems), "TRC-220 progress")
	assert.InDelta(t, 1720.0, trc220.LoadedKg, 0.5, "TRC-220 loaded kg")

	// Every stop of every demo trip has real items (no lineItems:0 stops)
	var emptyStops int
	err = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM public.load_stops s
		WHERE NOT EXISTS (SELECT 1 FROM public.load_items i WHERE i.stop_id = s.stop_id)
	`).Scan(&emptyStops)
	require.NoError(t, err)
	assert.Equal(t, 0, emptyStops, "no stop may have zero load_items")

	var inconsistentStops int
	err = pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM public.load_stops s
		WHERE s.removed_from_plan=FALSE AND (
			(s.status='PENDING' AND EXISTS (
				SELECT 1 FROM public.load_items i WHERE i.stop_id=s.stop_id AND i.status<>'PENDING'
			)) OR
			(s.status='LOADED' AND EXISTS (
				SELECT 1 FROM public.load_items i WHERE i.stop_id=s.stop_id AND i.status NOT IN ('CHECKED','ISSUE')
			)) OR
			(s.status='PENDING' AND (
				SELECT COUNT(*) FROM public.load_items i WHERE i.stop_id=s.stop_id AND i.status='PENDING'
			) <> (
				SELECT COUNT(*) FROM public.load_items i WHERE i.stop_id=s.stop_id
			))
		)
	`).Scan(&inconsistentStops)
	require.NoError(t, err)
	assert.Equal(t, 0, inconsistentStops, "seeded stop status and derived itemsRemaining must agree")

	rows, err := pool.Query(ctx, `
		WITH active AS (
			SELECT s.*,COUNT(*) OVER(PARTITION BY trip_id)::INT AS stop_count
			FROM public.load_stops s WHERE removed_from_plan=FALSE
		)
		SELECT t.vehicle_id,active.stop_no,active.load_order,active.stop_count
		FROM active JOIN public.trips t ON t.trip_id=active.trip_id
		WHERE active.load_order<>active.stop_count-active.stop_no+1
		ORDER BY t.vehicle_id,active.stop_no
	`)
	require.NoError(t, err)
	defer rows.Close()
	var invalidLoadOrders []string
	for rows.Next() {
		var vehicleID string
		var stopNo, loadOrder, stopCount int
		require.NoError(t, rows.Scan(&vehicleID, &stopNo, &loadOrder, &stopCount))
		invalidLoadOrders = append(invalidLoadOrders, fmt.Sprintf(
			"%s stop_no=%d load_order=%d expected=%d", vehicleID, stopNo, loadOrder, stopCount-stopNo+1,
		))
	}
	require.NoError(t, rows.Err())
	assert.Empty(t, invalidLoadOrders, "every seeded trip must load in reverse delivery order")

	// Report every integrity violation with its vehicle and stop name so a
	// broken fixture is immediately actionable.
	violations, err := pool.Query(ctx, `
		SELECT t.vehicle_id,COALESCE(s.outlet_name,'<trip>'),problem FROM (
		  SELECT s.trip_id,s.stop_id,'stop has zero items' problem FROM public.load_stops s
		  WHERE NOT EXISTS(SELECT 1 FROM public.load_items i WHERE i.stop_id=s.stop_id)
		  UNION ALL SELECT s.trip_id,s.stop_id,'PENDING stop has terminal item' FROM public.load_stops s
		  WHERE s.status='PENDING' AND EXISTS(SELECT 1 FROM public.load_items i WHERE i.stop_id=s.stop_id AND i.status<>'PENDING')
		  UNION ALL SELECT s.trip_id,s.stop_id,'LOADED stop has unresolved item' FROM public.load_stops s
		  WHERE s.status='LOADED' AND EXISTS(SELECT 1 FROM public.load_items i WHERE i.stop_id=s.stop_id AND i.status NOT IN('CHECKED','ISSUE'))
		  UNION ALL SELECT t.trip_id,NULL::uuid,'trip driver or vehicle missing' FROM public.trips t
		  LEFT JOIN public.user_profiles u ON u.id=t.driver_id LEFT JOIN public.vehicles v ON v.vehicle_id=t.vehicle_id
		  WHERE u.id IS NULL OR v.vehicle_id IS NULL
		  UNION ALL SELECT t.trip_id,NULL::uuid,'reefer/cold-item mismatch' FROM public.trips t JOIN public.vehicles v ON v.vehicle_id=t.vehicle_id
		  WHERE (v.temp='reefer') <> EXISTS(SELECT 1 FROM public.load_items i WHERE i.trip_id=t.trip_id AND (i.tags@>ARRAY['chilled']::text[] OR i.tags@>ARRAY['frozen']::text[]))
		  UNION ALL SELECT s.trip_id,s.stop_id,'item brand tag differs from outlet brand' FROM public.load_stops s JOIN public.outlets o ON o.outlet_id=s.outlet_id
		  WHERE EXISTS(SELECT 1 FROM public.load_items i WHERE i.stop_id=s.stop_id AND lower(i.tags[1])<>o.brand::text)
		) bad JOIN public.trips t ON t.trip_id=bad.trip_id LEFT JOIN public.load_stops s ON s.stop_id=bad.stop_id
		ORDER BY t.vehicle_id,COALESCE(s.outlet_name,'<trip>')`)
	require.NoError(t, err)
	defer violations.Close()
	var integrityFailures []string
	for violations.Next() {
		var vehicle, stop, problem string
		require.NoError(t, violations.Scan(&vehicle, &stop, &problem))
		integrityFailures = append(integrityFailures, fmt.Sprintf("%s / %s: %s", vehicle, stop, problem))
	}
	require.NoError(t, violations.Err())
	assert.Empty(t, integrityFailures, "all seeded trips must satisfy loader integrity rules")
}

func TestIntegration_FilterOptions(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	repo := repository.NewLoaderRepository(pool)
	svc := service.NewLoadingService(nil, repo, nil, slog.Default())
	ctx := context.Background()

	// 1. Unfiltered request
	respAll, err := svc.GetTodayLoads(ctx, model.TripsFilter{Date: "", Depot: "Peliyagoda"})
	require.NoError(t, err)
	assert.Len(t, respAll.Trips, 12, "Peliyagoda loader must see twelve trips")
	assert.Equal(t, 12, respAll.Summary.TripsToday)
	assert.Equal(t, 5, respAll.Summary.Loaded)
	assert.Equal(t, 4, respAll.Summary.InProgress)
	assert.Equal(t, 1, respAll.Summary.IssuesNeedReview)
	assert.Equal(t, 3, respAll.Summary.Pending)

	// 2. Filter by status: Ready
	respReady, err := svc.GetTodayLoads(ctx, model.TripsFilter{
		Depot:    "Peliyagoda",
		Statuses: []string{"Ready"},
	})
	require.NoError(t, err)
	assert.Len(t, respReady.Trips, 5, "Filtered trips should only return 5 Ready trips")
	for _, tr := range respReady.Trips {
		assert.Equal(t, "Ready", tr.Status)
	}
	// SUMMARY COUNTS MUST BE INDEPENDENT OF ACTIVE FILTERS
	assert.Equal(t, 12, respReady.Summary.TripsToday, "Summary must remain depot-wide even with status filter")
	assert.Equal(t, 5, respReady.Summary.Loaded, "Summary loaded must remain 5")

	// 3. Filter by dock: Dock A5
	respDock, err := svc.GetTodayLoads(ctx, model.TripsFilter{
		Depot: "Peliyagoda",
		Docks: []string{"Dock A5"},
	})
	require.NoError(t, err)
	assert.Len(t, respDock.Trips, 2)
	assert.Equal(t, 12, respDock.Summary.TripsToday, "Summary must remain independent of dock filter")

	// 4. Depot meta check
	assert.Equal(t, "Peliyagoda Distribution Center", respAll.Meta.Depot)
}

func TestIntegration_VLoadStopProgress(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	repo := repository.NewLoaderRepository(pool)
	ctx := context.Background()

	// Ensure clean demo state
	err := repo.ResetDemoState(ctx)
	require.NoError(t, err)

	// Query v_load_stop_progress directly for WPT-204
	rows, err := pool.Query(ctx, `
		SELECT 
			sp.stop_id, sp.stop_no, sp.load_order, sp.total_items,
			sp.loaded_items, sp.pending_items, sp.issue_items,
			sp.status, sp.outlet_name, sp.district
		FROM public.v_load_stop_progress sp
		JOIN public.trips t ON t.trip_id = sp.trip_id
		WHERE t.vehicle_id = 'TRC-204'
		ORDER BY sp.load_order ASC
	`)
	require.NoError(t, err)
	defer rows.Close()

	type StopRow struct {
		StopNo       int
		LoadOrder    int
		TotalItems   int
		CheckedItems int
		PendingItems int
		IssueItems   int
		StopStatus   string
		OutletName   string
		District     string
	}

	var stops []StopRow
	for rows.Next() {
		var s StopRow
		var stopID string
		err := rows.Scan(
			&stopID, &s.StopNo, &s.LoadOrder, &s.TotalItems,
			&s.CheckedItems, &s.PendingItems, &s.IssueItems,
			&s.StopStatus, &s.OutletName, &s.District,
		)
		require.NoError(t, err)
		stops = append(stops, s)
	}
	require.Len(t, stops, 4, "WPT-204 must have 4 stops in progress view")

	// Load order 1 is Stop 4 (Keells Super - LAST DROP in delivery, FIRST to load)
	assert.Equal(t, 1, stops[0].LoadOrder)
	assert.Equal(t, 4, stops[0].StopNo)
	assert.Equal(t, "Keells — Union Place", stops[0].OutletName)
	assert.Equal(t, 5, stops[0].TotalItems)
	assert.Equal(t, 4, stops[0].CheckedItems)
	assert.Equal(t, 1, stops[0].PendingItems, "Milk crates pending")
	assert.Equal(t, "LOADING", stops[0].StopStatus)

	// Load order 4 is Stop 1 (FreshMart - FIRST DROP in delivery, LAST to load)
	assert.Equal(t, 4, stops[3].LoadOrder)
	assert.Equal(t, 1, stops[3].StopNo)
	assert.Equal(t, "LOADED", stops[3].StopStatus)

	detailStops, err := repo.GetStopsWithProgressByTripID(ctx, uuid.MustParse("20400000-0000-0000-0000-000000000204"))
	require.NoError(t, err)
	tagsByStop := make(map[int][]string, len(detailStops))
	for _, stop := range detailStops {
		tagsByStop[stop.StopNo] = stop.Tags
	}
	assert.ElementsMatch(t, []string{"fresh", "chilled", "reefer"}, tagsByStop[4])
	assert.ElementsMatch(t, []string{"style"}, tagsByStop[3])
	assert.ElementsMatch(t, []string{"fresh", "chilled", "reefer"}, tagsByStop[2])
	assert.ElementsMatch(t, []string{"tech"}, tagsByStop[1])

	trc211, err := repo.GetTripByTripCodeOrID(ctx, "TRC-211")
	require.NoError(t, err)
	trc211Stops, err := repo.GetStopsWithProgressByTripID(ctx, trc211.TripID)
	require.NoError(t, err)
	require.NotEmpty(t, trc211Stops)
	assert.ElementsMatch(t, []string{"tech", "van_only"}, trc211Stops[0].Tags)
}

func TestIntegration_SRSequence(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	ctx := context.Background()

	// Verify next sequence produces 482
	var nextVal int64
	err := pool.QueryRow(ctx, `SELECT nextval('public.issue_flag_ref_seq')`).Scan(&nextVal)
	require.NoError(t, err)
	assert.Equal(t, int64(482), nextVal, "First live shortfall must produce 482")

	// Format check
	ref := fmt.Sprintf("SR-%04d", nextVal)
	assert.Equal(t, "SR-0482", ref)

	// Clean up sequence back to 481 for subsequent tests
	_, err = pool.Exec(ctx, `SELECT setval('public.issue_flag_ref_seq', 481, true)`)
	require.NoError(t, err)
}

func TestIntegration_ResetDemo(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	repo := repository.NewLoaderRepository(pool)
	ctx := context.Background()

	// 1. Fetch WPT-204 trip ID
	wpt204, err := repo.GetTripByTripCodeOrID(ctx, "WPT-204")
	require.NoError(t, err)
	require.NotNil(t, wpt204)

	// 2. Simulate dirtying the demo state:
	// - Advance sequence
	_, err = pool.Exec(ctx, `SELECT nextval('public.issue_flag_ref_seq')`)
	require.NoError(t, err)

	// - Add extra activity log
	loaderID := "11111111-1111-1111-1111-111111111101"
	_, err = pool.Exec(ctx, `
		INSERT INTO public.load_activity_log (trip_id, event_type, title, description, created_by)
		VALUES ($1, 'SHORTFALL', 'Live shortfall reported: Highland milk', 'Shortage', $2)
	`, wpt204.TripID, loaderID)
	require.NoError(t, err)

	// - Add extra issue flag for WPT-204
	_, err = pool.Exec(ctx, `
		INSERT INTO public.issue_flags (trip_id, flagged_by, issue_type, description, reason, resolved)
		VALUES ($1, $2, 'SHORTAGE', 'Highland milk crates missing', 'MISSING', FALSE)
	`, wpt204.TripID, loaderID)
	require.NoError(t, err)

	// 3. Execute ResetDemoState
	err = repo.ResetDemoState(ctx)
	require.NoError(t, err)

	// 4. Verify sequence reset to 481 (so nextval is 482)
	var nextVal int64
	err = pool.QueryRow(ctx, `SELECT nextval('public.issue_flag_ref_seq')`).Scan(&nextVal)
	require.NoError(t, err)
	assert.Equal(t, int64(482), nextVal, "After demo reset, next shortfall must be SR-0482")

	// Reset sequence to 481 again
	_, _ = pool.Exec(ctx, `SELECT setval('public.issue_flag_ref_seq', 481, true)`)

	// 5. Verify activity log has only 2 rows
	var logCount int
	err = pool.QueryRow(ctx, `SELECT count(*) FROM public.load_activity_log WHERE trip_id = $1`, wpt204.TripID).Scan(&logCount)
	require.NoError(t, err)
	assert.Equal(t, 2, logCount, "Activity log must contain exactly 2 initial rows")

	// 6. Verify issue_flags for WPT-204 is 0
	var issueCount int
	err = pool.QueryRow(ctx, `SELECT count(*) FROM public.issue_flags WHERE trip_id = $1`, wpt204.TripID).Scan(&issueCount)
	require.NoError(t, err)
	assert.Equal(t, 0, issueCount, "WPT-204 issue flags must be completely cleaned up")

	var trc211Version int
	err = pool.QueryRow(ctx, `SELECT version FROM public.loading_confirmations WHERE trip_id='21100000-0000-0000-0000-000000000211'`).Scan(&trc211Version)
	require.NoError(t, err)
	assert.Equal(t, 0, trc211Version, "reset-demo must restore TRC-211 route version")
}

func TestIntegration_StartStopLoading(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	repo := repository.NewLoaderRepository(pool)
	ctx := context.Background()

	// Reset demo state first so WPT-204 is clean
	wpt204, err := repo.GetTripByTripCodeOrID(ctx, "WPT-204")
	require.NoError(t, err)

	err = repo.ResetDemoState(ctx)
	require.NoError(t, err)

	stops, err := repo.GetStopsWithProgressByTripID(ctx, wpt204.TripID)
	require.NoError(t, err)
	require.Len(t, stops, 4)

	// Load order 1 is Keells (stop 4), currently LOADING
	// Mark Keells stop as PENDING in DB temporarily to test out-of-sequence
	stop0UUID := uuid.MustParse(stops[0].StopID)
	stop1UUID := uuid.MustParse(stops[1].StopID)
	loaderUUID := uuid.MustParse("11111111-1111-1111-1111-111111111101")

	_, err = pool.Exec(ctx, `UPDATE public.load_stops SET status = 'PENDING' WHERE stop_id = $1`, stop0UUID)
	require.NoError(t, err)

	// Attempt to start load order 2 (stops[1]) while load order 1 is PENDING (not LOADED)
	_, err = repo.StartStopLoading(ctx, wpt204.TripID, stop1UUID, 0, loaderUUID)
	require.Error(t, err)
	assert.Contains(t, err.Error(), model.ErrCodeOutOfSequence, "Starting stop out of load order must return OUT_OF_SEQUENCE 409")

	// Start load order 1 (stops[0])
	updatedStop, err := repo.StartStopLoading(ctx, wpt204.TripID, stop0UUID, 0, loaderUUID)
	require.NoError(t, err)
	assert.Equal(t, "LOADING", updatedStop.Status)

	// Idempotent test: start load order 1 again
	updatedStop2, err := repo.StartStopLoading(ctx, wpt204.TripID, stop0UUID, 0, loaderUUID)
	require.NoError(t, err)
	assert.Equal(t, "LOADING", updatedStop2.Status)

	// Verify activity log: only one "Stop 4 loading opened" entry should exist
	var openedCount int
	err = pool.QueryRow(ctx, `
		SELECT count(*) FROM public.load_activity_log 
		WHERE trip_id = $1 AND title LIKE '%Stop 4 loading opened%'
	`, wpt204.TripID).Scan(&openedCount)
	require.NoError(t, err)
	assert.Equal(t, 1, openedCount, "Activity log must record opening stop once only (idempotent)")
}

func TestIntegration_DemoFlow_P5_P6(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()

	repo := repository.NewLoaderRepository(pool)
	svc := service.NewLoadingService(nil, repo, nil, slog.Default())
	ctx := context.Background()

	// 1. Reset demo state
	err := repo.ResetDemoState(ctx)
	require.NoError(t, err)

	// Fetch WPT-204 trip
	wpt204, err := repo.GetTripByTripCodeOrID(ctx, "WPT-204")
	require.NoError(t, err)
	require.NotNil(t, wpt204)

	// Fetch stops for WPT-204
	stops, err := repo.GetStopsWithProgressByTripID(ctx, wpt204.TripID)
	require.NoError(t, err)
	require.Len(t, stops, 4)

	// Stop 4 is Keells Super (load_order 1)
	var stop4 model.LoadStopDetailDTO
	for _, s := range stops {
		if s.StopNo == 4 {
			stop4 = s
			break
		}
	}
	require.NotEmpty(t, stop4.StopID)
	stop4UUID := uuid.MustParse(stop4.StopID)
	loaderUUID := uuid.MustParse("11111111-1111-1111-1111-111111111101")

	// 2. Check state shows "4 of 5 checked" and canConfirm = false
	itemsResp, err := repo.GetStopItems(ctx, wpt204.TripID, stop4UUID)
	require.NoError(t, err)
	assert.Equal(t, 4, itemsResp.Progress.Checked)
	assert.Equal(t, 5, itemsResp.Progress.Total)
	assert.Equal(t, 80, itemsResp.Progress.Pct)
	assert.Equal(t, "4 of 5 checked", itemsResp.Progress.Label)
	assert.False(t, itemsResp.CanConfirm, "canConfirm must be false when milk crates are pending")
	require.NotNil(t, itemsResp.BlockReason)
	assert.Contains(t, *itemsResp.BlockReason, "Highland full cream milk crates")

	// 3. Confirm returns 422 CHECKLIST_INCOMPLETE
	_, err = repo.ConfirmStop(ctx, wpt204.TripID, stop4UUID, 0, loaderUUID)
	require.Error(t, err)
	var chkErr *model.ChecklistIncompleteError
	require.ErrorAs(t, err, &chkErr)
	assert.Equal(t, model.ErrCodeChecklistIncomplete, chkErr.Code)
	assert.Equal(t, 1, chkErr.Unchecked)

	// 4. Post shortfall (SR-0482)
	// Find Highland milk crates pending item
	var milkCratesItem *model.ChecklistItem
	for i := range itemsResp.Items {
		if itemsResp.Items[i].Status == "PENDING" {
			milkCratesItem = &itemsResp.Items[i]
			break
		}
	}
	require.NotNil(t, milkCratesItem, "Must have pending milk crates item")
	milkItemID := uuid.MustParse(milkCratesItem.ItemID)

	shortfallResp, err := repo.CreateShortfall(ctx, repository.ShortfallParams{
		TripID:       wpt204.TripID,
		StopID:       stop4UUID,
		ItemID:       milkItemID,
		QtyAffected:  2,
		Reason:       "SHORT_SHIPPED",
		Note:         "Highland milk crates - 2 crates short-shipped",
		PhotoURL:     nil,
		LoaderID:     loaderUUID,
		ReporterName: "loader@waypoint.lk",
	})
	require.NoError(t, err)
	assert.Equal(t, "SR-0482", shortfallResp.Ref)
	assert.True(t, shortfallResp.DispatcherNotified)
	assert.True(t, shortfallResp.ChecklistUnlocked)
	assert.Equal(t, 24, shortfallResp.AffectedItem.Expected)
	assert.Equal(t, 22, shortfallResp.AffectedItem.Loaded)
	assert.Equal(t, -2, shortfallResp.AffectedItem.Delta)
	// Weight delta: 384 kg / 24 crates * 2 crates = -32.0 kg
	assert.Equal(t, -32.0, shortfallResp.ManifestImpact.WeightDeltaKg)
	assert.Equal(t, 24, shortfallResp.ManifestImpact.ItemQtyFrom)
	assert.Equal(t, 22, shortfallResp.ManifestImpact.ItemQtyTo)
	assert.Equal(t, "crates", shortfallResp.ManifestImpact.ItemUnit)

	// Duplicate shortfall on same item is rejected (409 ITEM_HAS_ISSUE)
	_, dupErr := repo.CreateShortfall(ctx, repository.ShortfallParams{
		TripID: wpt204.TripID, StopID: stop4UUID, ItemID: milkItemID,
		QtyAffected: 1, Reason: "MISSING", LoaderID: loaderUUID,
	})
	require.Error(t, dupErr)
	assert.Contains(t, dupErr.Error(), model.ErrCodeItemHasIssue)

	// 5. canConfirm = true after shortfall
	itemsRespAfter, err := repo.GetStopItems(ctx, wpt204.TripID, stop4UUID)
	require.NoError(t, err)
	assert.True(t, itemsRespAfter.CanConfirm, "canConfirm must be true now that pending item is marked ISSUE")
	assert.Nil(t, itemsRespAfter.BlockReason)

	// 6. Confirm stop succeeds
	updatedStop, err := repo.ConfirmStop(ctx, wpt204.TripID, stop4UUID, 0, loaderUUID)
	require.NoError(t, err)
	assert.Equal(t, "LOADED", updatedStop.Status)

	// 7. Today's Loads / detail show 29 CHECKED of 30 with 1 exception, activity log order correct
	// Check Today's Loads overview
	todayLoads, err := svc.GetTodayLoads(ctx, model.TripsFilter{Date: "2026-10-03"})
	require.NoError(t, err)
	var wpt204Overview *model.TripItemDTO
	for i := range todayLoads.Trips {
		if todayLoads.Trips[i].VehicleID == "TRC-204" {
			wpt204Overview = &todayLoads.Trips[i]
			break
		}
	}
	require.NotNil(t, wpt204Overview)
	assert.Equal(t, 97, wpt204Overview.ProgressPct, "29 of 30 items checked is 97%")
	// Status is derived: an open issue_flag (SR-0482) overrides Ready -> Issue
	assert.Equal(t, model.DerivedStatusIssue, wpt204Overview.Status)

	// Check Trip Detail
	tripDetail, err := svc.GetTripDetails(ctx, wpt204.TripID.String())
	require.NoError(t, err)
	assert.Equal(t, 1, tripDetail.Version, "trip detail exposes the incremented optimistic-lock version")
	assert.Equal(t, 97, tripDetail.Vehicle.LoadPct, "Vehicle loadPct must be item-based 97%")
	assert.Equal(t, 29, tripDetail.Totals.ItemsChecked)
	assert.Equal(t, 30, tripDetail.Totals.ItemsTotal)
	assert.Equal(t, 1, tripDetail.Totals.Exceptions, "Must show 1 exception for the shortfall")

	// Activity log (chronological ASC): ..., Shortfall reported, Stop 4 confirmed loaded, All stops completed
	logs, err := repo.GetActivityLogByTripID(ctx, wpt204.TripID)
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(logs), 5, "Must have at least 5 activity log entries")
	n := len(logs)
	assert.Equal(t, "Loading started", logs[0].Title)
	assert.Equal(t, "Shortfall reported", logs[n-3].Title)
	assert.Equal(t, "Highland full cream milk crates - 2 crates short-shipped", *logs[n-3].Description)
	assert.Equal(t, "Stop 4 confirmed loaded", logs[n-2].Title)
	assert.Equal(t, "Issue attached to dispatch manifest", *logs[n-2].Description)
	assert.Equal(t, "All stops completed", logs[n-1].Title)
	assert.Equal(t, "4 of 4 stop checklists confirmed", *logs[n-1].Description)

	// Confirm is idempotent: second call succeeds and writes no duplicate log rows
	_, err = repo.ConfirmStop(ctx, wpt204.TripID, stop4UUID, 0, loaderUUID)
	require.NoError(t, err)
	logs2, err := repo.GetActivityLogByTripID(ctx, wpt204.TripID)
	require.NoError(t, err)
	assert.Equal(t, n, len(logs2), "Re-confirm must not duplicate activity log entries")

	// 8. Outbox row published and a test consumer receives flag.raised exactly once
	amqpURL := os.Getenv("TEST_RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = os.Getenv("RABBITMQ_URL")
	}
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5673/"
	}

	conn, err := amqp.Dial(amqpURL)
	require.NoError(t, err, "Failed to connect to test RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	require.NoError(t, err)
	defer ch.Close()

	// Declare exchange and bind a dedicated test queue
	exchangeName := "waypoint.events"
	routingKey := "flag.raised"
	err = ch.ExchangeDeclare(exchangeName, "topic", true, false, false, false, nil)
	require.NoError(t, err)

	q, err := ch.QueueDeclare("", false, true, true, false, nil)
	require.NoError(t, err)

	err = ch.QueueBind(q.Name, routingKey, exchangeName, false, nil)
	require.NoError(t, err)

	deliveries, err := ch.Consume(q.Name, "test-consumer", true, false, false, false, nil)
	require.NoError(t, err)

	// Process outbox worker batch
	outboxWorker := service.NewOutboxWorker(pool, amqpURL, exchangeName, routingKey, slog.Default())
	err = outboxWorker.ProcessPendingEvents(ctx)
	require.NoError(t, err)

	// Verify test consumer receives flag.raised
	select {
	case msg := <-deliveries:
		assert.Equal(t, "flag.raised", msg.RoutingKey)
		var payload FlagRaisedEventTestShape
		err = json.Unmarshal(msg.Body, &payload)
		require.NoError(t, err)
		assert.Equal(t, "SR-0482", payload.ShortfallRef)
		assert.Equal(t, "WPT-204", payload.TripCode)
		assert.Equal(t, "SHORT_SHIPPED", payload.Reason)
		assert.NotEmpty(t, payload.ReportedByID)
		// Targeting fields
		assert.NotEmpty(t, payload.TargetOutletID)
	case <-time.After(3 * time.Second):
		t.Fatal("Timed out waiting for outbox event on RabbitMQ")
	}

	// Verify outbox row in DB is marked PUBLISHED
	var outboxStatus string
	err = pool.QueryRow(ctx, `
		SELECT status FROM public.outbox_events
		WHERE aggregate_id = 'SR-0482' AND event_type = 'FLAG_RAISED'
	`).Scan(&outboxStatus)
	require.NoError(t, err)
	assert.Equal(t, "PUBLISHED", outboxStatus)

	// Run ProcessPendingEvents again; no new delivery should arrive (exactly once)
	err = outboxWorker.ProcessPendingEvents(ctx)
	require.NoError(t, err)

	select {
	case dupMsg := <-deliveries:
		t.Fatalf("Unexpected duplicate delivery received: %s", string(dupMsg.Body))
	case <-time.After(500 * time.Millisecond):
		// Expected: no duplicate
	}

	// -------------------------------------------------------------------------
	// 9. Check Departure Screen (P7)
	// -------------------------------------------------------------------------
	departureSvc := service.NewDepartureService(repository.NewDepartureRepository(pool), repo, slog.Default())
	depRes, err := departureSvc.GetDeparture(ctx, wpt204.TripID.String())
	require.NoError(t, err)
	assert.Equal(t, model.DerivedStatusIssue, depRes.Status)
	assert.Equal(t, 29, depRes.LoadSummary.ItemsLoaded, "only CHECKED items count as loaded")
	assert.Equal(t, 30, depRes.LoadSummary.ItemsTotal)
	assert.Equal(t, 4, depRes.LoadSummary.StopsComplete)
	assert.Equal(t, 4, depRes.LoadSummary.StopsTotal)
	assert.Equal(t, 1, depRes.LoadSummary.IssuesFlagged)
	assert.True(t, depRes.Confirmation.AllChecksPassed)
	require.Empty(t, depRes.Confirmation.Blockers, "notified shortfalls are not blockers")
	require.GreaterOrEqual(t, len(depRes.ActivityLog), 2)
	assert.Equal(t, "07:30", depRes.ActivityLog[0].Time)
	assert.Equal(t, "08:12", depRes.ActivityLog[1].Time)

	// Verify shortfalls list
	require.Len(t, depRes.Shortfalls, 1)
	assert.Equal(t, "SR-0482", depRes.Shortfalls[0].Ref)
	assert.Equal(t, "Highland full cream milk crates", depRes.Shortfalls[0].Item)
	assert.Equal(t, "SHORT_SHIPPED", depRes.Shortfalls[0].Reason)
	assert.Equal(t, 2, depRes.Shortfalls[0].Qty)

	// -------------------------------------------------------------------------
	// 10. Mark Ready (P7)
	// -------------------------------------------------------------------------
	mrRes, err := departureSvc.MarkReady(ctx, wpt204.TripID.String(), loaderUUID.String())
	require.NoError(t, err)
	assert.Equal(t, "WPT-204", mrRes.TripCode)
	assert.Equal(t, "TRC-204", mrRes.VehicleID)
	assert.Equal(t, 29, mrRes.ItemsLoaded)
	assert.Equal(t, 30, mrRes.ItemsTotal)
	readyDeparture, err := departureSvc.GetDeparture(ctx, wpt204.TripID.String())
	require.NoError(t, err)
	assert.Equal(t, model.DerivedStatusReady, readyDeparture.Status, "ready_at overrides open issues")

	// Ensure idempotent
	mrRes2, err := departureSvc.MarkReady(ctx, wpt204.TripID.String(), loaderUUID.String())
	require.NoError(t, err)
	assert.WithinDuration(t, mrRes.ReadyAt, mrRes2.ReadyAt, time.Millisecond, "Idempotent call should return identical ReadyAt")

	// -------------------------------------------------------------------------
	// 11. Verify LOADING_COMPLETED Outbox event (P7)
	// -------------------------------------------------------------------------
	err = ch.QueueBind(q.Name, "loading.completed", exchangeName, false, nil)
	require.NoError(t, err)

	err = outboxWorker.ProcessPendingEvents(ctx)
	require.NoError(t, err)

	select {
	case msg := <-deliveries:
		assert.Equal(t, "loading.completed", msg.RoutingKey)
		var payload LoadingCompletedEventTestShape
		err = json.Unmarshal(msg.Body, &payload)
		require.NoError(t, err)
		assert.Equal(t, wpt204.TripID.String(), payload.TripID)
		assert.Equal(t, "WPT-204", payload.TripCode)
		assert.Equal(t, "TRC-204", payload.VehicleID)
		assert.NotEmpty(t, payload.DriverID)
		assert.NotEmpty(t, payload.ReadyAt)
		assert.Equal(t, loaderUUID.String(), payload.ReadyByID)
		assert.Equal(t, 1, payload.IssueCount)
	case <-time.After(3 * time.Second):
		t.Fatal("Timed out waiting for loading.completed event on RabbitMQ")
	}

	// Double check that activity log got the final confirmation row
	logs3, err := repo.GetActivityLogByTripID(ctx, wpt204.TripID)
	require.NoError(t, err)
	assert.Equal(t, n+1, len(logs3), "MarkReady should add 1 confirmation row")
	assert.Equal(t, "Loading confirmation recorded", logs3[len(logs3)-1].Title)
}

func TestIntegration_AllocationCompletedRabbitMQ(t *testing.T) {
	pool := getTestPool(t)
	defer pool.Close()
	ctx := context.Background()
	tripID := uuid.MustParse("44444444-4444-4444-4444-444444444404")
	driverID := uuid.MustParse("22222222-2222-2222-2222-222222222201")

	_, err := pool.Exec(ctx, `DELETE FROM public.trips WHERE trip_id=$1`, tripID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO public.outlets(outlet_id,name,district,depot,parking_type) VALUES
		 ('P4-OUT-A','P4 Outlet A','Colombo District','DEPOT-01','STANDARD'),
		 ('P4-OUT-B','P4 Outlet B','Colombo District','DEPOT-01','STANDARD'),
		 ('P4-OUT-C','P4 Outlet C','Colombo District','DEPOT-01','STANDARD') ON CONFLICT(outlet_id) DO NOTHING`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO public.vehicles(vehicle_id,registration,type,temp,weight_cap_kg,volume_cap_m3,temp_capability,depot,brand,driver_id)
		 VALUES('TRC-404','P4-404','truck','ambient',5000,20,'AMBIENT','DEPOT-01','Fresh',$1) ON CONFLICT(vehicle_id) DO NOTHING`, driverID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO public.orders(id,outlet_id,product_code,quantity,weight_kg,volume_m3,brand,temp_requirement,preferred_date,window_open,window_close,status)
		 VALUES
		 ('44444444-4444-4444-4444-444444444401','P4-OUT-A','SKU-A',10,100,1,'fresh','AMBIENT','2026-10-04','08:00','17:00','ALLOCATED'),
		 ('44444444-4444-4444-4444-444444444402','P4-OUT-B','SKU-B',20,200,2,'fresh','AMBIENT','2026-10-04','08:00','17:00','ALLOCATED'),
		 ('44444444-4444-4444-4444-444444444403','P4-OUT-C','SKU-C',30,300,3,'fresh','AMBIENT','2026-10-04','08:00','17:00','ALLOCATED') ON CONFLICT(id) DO NOTHING`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO public.trips(trip_id,vehicle_id,driver_id,trip_number,delivery_date,status,stop_sequence,total_weight_kg,total_volume_m3)
		 VALUES($1,'TRC-404',$2,1,'2026-10-04','PLANNED',ARRAY['P4-OUT-A','P4-OUT-B'],300,3)
	`, tripID, driverID)
	require.NoError(t, err)

	amqpURL := os.Getenv("TEST_RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5673/"
	}
	consumer := service.NewAllocationConsumer(repository.NewAllocationRepository(pool), amqpURL, "waypoint.events", slog.Default())
	consumer.Start()
	defer consumer.Stop()
	time.Sleep(300 * time.Millisecond)

	publish := func(event model.AllocationCompletedEvent) {
		body, marshalErr := json.Marshal(event)
		require.NoError(t, marshalErr)
		conn, dialErr := amqp.Dial(amqpURL)
		require.NoError(t, dialErr)
		defer conn.Close()
		ch, channelErr := conn.Channel()
		require.NoError(t, channelErr)
		defer ch.Close()
		require.NoError(t, ch.PublishWithContext(ctx, "waypoint.events", "allocation.completed", false, false, amqp.Publishing{ContentType: "application/json", Body: body}))
	}
	item := func(id, sku, name string, qty int) model.AllocationItem {
		return model.AllocationItem{ItemID: id, SKU: sku, Name: name, ExpectedQty: qty, Unit: "cases", WeightKg: float64(qty * 10), Tags: []string{"ambient"}}
	}
	revision1 := model.AllocationCompletedEvent{Date: "2026-10-04", Revision: 1, UpdatedBy: "dispatcher@waypoint.lk", Trips: []model.AllocationTrip{{TripID: tripID.String(), VehicleID: "TRC-404", DriverID: driverID.String(), TripNo: 1, Dock: "Dock P4", Stops: []model.AllocationStop{
		{Sequence: 1, OutletID: "P4-OUT-A", Outlet: "P4 Outlet A", District: "Colombo District", Orders: []model.AllocationOrder{{OrderID: "44444444-4444-4444-4444-444444444401", Items: []model.AllocationItem{item("44444444-4444-4444-4444-444444444411", "SKU-A", "Item A", 10)}}}},
		{Sequence: 2, OutletID: "P4-OUT-B", Outlet: "P4 Outlet B", District: "Colombo District", Orders: []model.AllocationOrder{{OrderID: "44444444-4444-4444-4444-444444444402", Items: []model.AllocationItem{item("44444444-4444-4444-4444-444444444412", "SKU-B", "Item B", 20)}}}},
	}}}}
	publish(revision1)
	require.Eventually(t, func() bool {
		var stops, items int
		_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.load_stops WHERE trip_id=$1 AND removed_from_plan=FALSE`, tripID).Scan(&stops)
		_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.load_items WHERE trip_id=$1`, tripID).Scan(&items)
		return stops == 2 && items == 2
	}, 5*time.Second, 100*time.Millisecond)

	// Redelivery is idempotent by trip_id + revision.
	publish(revision1)
	time.Sleep(300 * time.Millisecond)
	var receipts int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.allocation_event_receipts WHERE trip_id=$1`, tripID).Scan(&receipts))
	assert.Equal(t, 1, receipts)

	revision2 := revision1
	revision2.Revision = 2
	revision2.UpdatedBy = "dispatcher-2@waypoint.lk"
	revision2.Trips[0].Stops = []model.AllocationStop{
		{Sequence: 1, OutletID: "P4-OUT-B", Outlet: "P4 Outlet B", District: "Colombo District", Orders: []model.AllocationOrder{{OrderID: "44444444-4444-4444-4444-444444444402", Items: []model.AllocationItem{item("44444444-4444-4444-4444-444444444412", "SKU-B", "Item B", 20)}}}},
		{Sequence: 2, OutletID: "P4-OUT-C", Outlet: "P4 Outlet C", District: "Colombo District", Orders: []model.AllocationOrder{{OrderID: "44444444-4444-4444-4444-444444444403", Items: []model.AllocationItem{item("44444444-4444-4444-4444-444444444413", "SKU-C", "Item C", 30)}}}},
	}
	publish(revision2)
	require.Eventually(t, func() bool {
		var rev int
		_ = pool.QueryRow(ctx, `SELECT plan_revision FROM public.loading_confirmations WHERE trip_id=$1`, tripID).Scan(&rev)
		return rev == 2
	}, 5*time.Second, 100*time.Millisecond)
	latest, err := repository.NewAllocationRepository(pool).GetLatestPlanChange(ctx, tripID)
	require.NoError(t, err)
	assert.Equal(t, 2, latest.Revision)
	assert.False(t, latest.Acknowledged)
	assert.Equal(t, "REMOVED", latest.Previous[0].Change)
	assert.Equal(t, "REORDERED", latest.Updated[0].Change)
	assert.Equal(t, "NEW", latest.Updated[1].Change)
	var removed bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT removed_from_plan FROM public.load_stops WHERE trip_id=$1 AND outlet_id='P4-OUT-A'`, tripID).Scan(&removed))
	assert.True(t, removed)

	loaderRepo := repository.NewLoaderRepository(pool)
	var activeStopID, activeItemID uuid.UUID
	require.NoError(t, pool.QueryRow(ctx, `SELECT s.stop_id,i.item_id FROM public.load_stops s JOIN public.load_items i ON i.stop_id=s.stop_id WHERE s.trip_id=$1 AND s.outlet_id='P4-OUT-B' AND s.removed_from_plan=FALSE LIMIT 1`, tripID).Scan(&activeStopID, &activeItemID))
	_, err = loaderRepo.StartStopLoading(ctx, tripID, activeStopID, 0, uuid.MustParse("11111111-1111-1111-1111-111111111101"))
	require.Error(t, err)
	assert.Equal(t, model.ErrCodePlanUnacknowledged, err.(*model.AppError).Code)
	_, err = loaderRepo.CheckItem(ctx, activeItemID, true, uuid.MustParse("11111111-1111-1111-1111-111111111101"))
	require.Error(t, err)
	assert.Equal(t, model.ErrCodePlanUnacknowledged, err.(*model.AppError).Code)
	_, err = loaderRepo.ConfirmStop(ctx, tripID, activeStopID, 0, uuid.MustParse("11111111-1111-1111-1111-111111111101"))
	require.Error(t, err)
	assert.Equal(t, model.ErrCodePlanUnacknowledged, err.(*model.AppError).Code)

	loadingSvc := service.NewLoadingService(nil, loaderRepo, nil, slog.Default())
	loadingSvc.SetAllocationRepository(repository.NewAllocationRepository(pool))
	detail, err := loadingSvc.GetTripDetails(ctx, tripID.String())
	require.NoError(t, err)
	require.NotNil(t, detail.PlanBanner)
	ack, err := repository.NewAllocationRepository(pool).AcknowledgePlanChange(ctx, tripID, 2, uuid.MustParse("11111111-1111-1111-1111-111111111101"))
	require.NoError(t, err)
	assert.True(t, ack.Acknowledged)

	// A third revision must also succeed when an earlier revision already left
	// a removed historical stop in the trip.
	revision3 := revision2
	revision3.Revision = 3
	revision3.UpdatedBy = "dispatcher-3@waypoint.lk"
	revision3.Trips[0].Stops[0], revision3.Trips[0].Stops[1] = revision3.Trips[0].Stops[1], revision3.Trips[0].Stops[0]
	revision3.Trips[0].Stops[0].Sequence = 1
	revision3.Trips[0].Stops[1].Sequence = 2
	publish(revision3)
	require.Eventually(t, func() bool {
		var rev int
		_ = pool.QueryRow(ctx, `SELECT plan_revision FROM public.loading_confirmations WHERE trip_id=$1`, tripID).Scan(&rev)
		return rev == 3
	}, 5*time.Second, 100*time.Millisecond)
}
