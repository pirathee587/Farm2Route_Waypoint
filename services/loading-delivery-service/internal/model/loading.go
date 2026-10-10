package model

import (
	"time"

	"github.com/google/uuid"
)

// UI Derived Statuses (derived from open issue_flags, progress, and confirmation status)
const (
	DerivedStatusNotStarted = "Not Started"
	DerivedStatusLoading    = "Loading"
	DerivedStatusReady      = "Ready"
	DerivedStatusIssue      = "Issue"
)

// DB Enum string values for loading_status
const (
	LoadingStatusPending  = "PENDING"
	LoadingStatusLoading  = "LOADING"
	LoadingStatusLoaded   = "LOADED"
	LoadingStatusDeparted = "DEPARTED"
)

// DB Enum string values for load item checklist
const (
	ItemStatusPending = "PENDING"
	ItemStatusChecked = "CHECKED"
	ItemStatusIssue   = "ISSUE"
)

// DB Enum string values for issue_flags reason
const (
	IssueReasonMissing      = "MISSING"
	IssueReasonDamaged      = "DAMAGED"
	IssueReasonShortShipped = "SHORT_SHIPPED"
)

// DB Enum string values for issue_type
const (
	IssueTypeDamage      = "DAMAGE"
	IssueTypeShortage    = "SHORTAGE"
	IssueTypeWrongItem   = "WRONG_ITEM"
	IssueTypeTemperature = "TEMPERATURE"
	IssueTypeOther       = "OTHER"
)

// LoadingConfirmation represents a load session per trip (table: public.loading_confirmations)
type LoadingConfirmation struct {
	ID                uuid.UUID  `json:"id"`
	TripID            uuid.UUID  `json:"trip_id"`
	LoaderID          *uuid.UUID `json:"loader_id,omitempty"`
	Status            string     `json:"status"` // PENDING | LOADING | LOADED | DEPARTED
	ConfirmedOrderIDs []string   `json:"confirmed_order_ids"`
	UnloadedItems     []byte     `json:"unloaded_items"` // raw jsonb
	Dock              *string    `json:"dock,omitempty"`
	PlanRevision      int        `json:"plan_revision"`
	ReadyAt           *time.Time `json:"ready_at,omitempty"`
	ReadyBy           *uuid.UUID `json:"ready_by,omitempty"`
	Version           int        `json:"version"`
	LoadedAt          *time.Time `json:"loaded_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// LoadStop represents a stop in a trip with delivery sequence and reverse loading order
type LoadStop struct {
	StopID        uuid.UUID `json:"stop_id"`
	TripID        uuid.UUID `json:"trip_id"`
	StopNo        int       `json:"stop_no"`    // Delivery sequence: 1, 2, 3, 4
	LoadOrder     int       `json:"load_order"` // Loading sequence: 4, 3, 2, 1
	OutletID      string    `json:"outlet_id"`
	OutletName    string    `json:"outlet_name"`
	District      string    `json:"district,omitempty"`
	BayInfo       string    `json:"bay_info,omitempty"`
	Status        string    `json:"status"` // PENDING | LOADING | LOADED
	Tag           string    `json:"tag,omitempty"`
	DockNote      string    `json:"dock_note,omitempty"`
	TotalUnits    int       `json:"total_units"`
	TotalCrates   int       `json:"total_crates"`
	TotalItems    int       `json:"total_items"`  // computed from view
	LoadedItems   int       `json:"loaded_items"` // computed from view
	TotalWeightKg float64   `json:"total_weight_kg"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// LoadItem represents an individual SKU/crate checklist line item (table: public.load_items)
type LoadItem struct {
	ItemID      uuid.UUID  `json:"item_id"`
	StopID      uuid.UUID  `json:"stop_id"`
	TripID      uuid.UUID  `json:"trip_id"`
	OrderID     *uuid.UUID `json:"order_id,omitempty"`
	SKU         string     `json:"sku"`
	Name        string     `json:"name"`
	ExpectedQty int        `json:"expected_qty"`
	LoadedQty   int        `json:"loaded_qty"`
	Unit        string     `json:"unit"`
	WeightKg    float64    `json:"weight_kg"`
	Tags        []string   `json:"tags"`
	Status      string     `json:"status"` // PENDING | CHECKED | ISSUE
	CheckedAt   *time.Time `json:"checked_at,omitempty"`
	CheckedBy   *uuid.UUID `json:"checked_by,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// IssueFlag represents a flagged shortfall, damage, or discrepancy (table: public.issue_flags)
type IssueFlag struct {
	IssueID              uuid.UUID  `json:"issue_id"`
	TripID               uuid.UUID  `json:"trip_id"`
	OrderID              *uuid.UUID `json:"order_id,omitempty"`
	FlaggedBy            uuid.UUID  `json:"flagged_by"`
	IssueType            string     `json:"issue_type"` // SHORTAGE, DAMAGE, etc.
	Ref                  string     `json:"ref"`        // Human-readable SR-0001
	StopID               *uuid.UUID `json:"stop_id,omitempty"`
	ItemID               *uuid.UUID `json:"item_id,omitempty"`
	QtyAffected          *int       `json:"qty_affected,omitempty"`
	Reason               *string    `json:"reason,omitempty"` // MISSING | DAMAGED | SHORT_SHIPPED
	Description          string     `json:"description"`
	EvidenceURL          *string    `json:"evidence_url,omitempty"`
	WeightDeltaKg        float64    `json:"weight_delta_kg"`
	DispatcherNotifiedAt *time.Time `json:"dispatcher_notified_at,omitempty"`
	Resolved             bool       `json:"resolved"`
	ResolvedBy           *uuid.UUID `json:"resolved_by,omitempty"`
	ResolvedAt           *time.Time `json:"resolved_at,omitempty"`
	ResolutionNotes      *string    `json:"resolution_notes,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

// LoadActivityLog represents a chronological audit event in the loading cycle (table: public.load_activity_log)
type LoadActivityLog struct {
	ID          uuid.UUID  `json:"id"`
	TripID      uuid.UUID  `json:"trip_id"`
	EventType   string     `json:"event_type"` // START, STOP_OPENED, SHORTFALL, STOP_CONFIRMED, STOPS_COMPLETED, CONFIRMATION
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	IconType    string     `json:"icon_type"` // play, package, alert, check, list, user
	LoggedAt    time.Time  `json:"logged_at"`
	CreatedBy   *uuid.UUID `json:"created_by,omitempty"`
}

// PlanChange records route/sequence changes and loader acknowledgments (table: public.plan_changes)
type PlanChange struct {
	ID             uuid.UUID  `json:"id"`
	TripID         uuid.UUID  `json:"trip_id"`
	Revision       int        `json:"revision"`
	Summary        string     `json:"summary"`
	Details        []byte     `json:"details"` // JSONB payload
	Acknowledged   bool       `json:"acknowledged"`
	AcknowledgedAt *time.Time `json:"acknowledged_at,omitempty"`
	AcknowledgedBy *uuid.UUID `json:"acknowledged_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type PlanStopSnapshot struct {
	StopID    string `json:"stopId"`
	OutletID  string `json:"outletId"`
	Outlet    string `json:"outlet"`
	Sequence  int    `json:"sequence"`
	LoadOrder int    `json:"loadOrder"`
	Change    string `json:"change,omitempty"`
}

type PlanChangeResponse struct {
	Revision     int                `json:"revision"`
	UpdatedAt    time.Time          `json:"updatedAt"`
	UpdatedBy    string             `json:"updatedBy"`
	Previous     []PlanStopSnapshot `json:"previous"`
	Updated      []PlanStopSnapshot `json:"updated"`
	Acknowledged bool               `json:"acknowledged"`
}

// ── Today's Loads API DTOs ──────────────────────────────────────────────────

// TripItemDTO matches the JSON contract expected by the Loader frontend
type TripItemDTO struct {
	TripID      string  `json:"tripId"`
	TripCode    string  `json:"tripCode"`
	VehicleID   string  `json:"vehicleId"`
	Status      string  `json:"status"` // "Loading" | "Ready" | "Not Started" | "Issue"
	ProgressPct int     `json:"progressPct"`
	LoadedKg    float64 `json:"loadedKg"`
	CapacityKg  float64 `json:"capacityKg"`
	Origin      string  `json:"origin"`
	Destination string  `json:"destination"`
	StopCount   int     `json:"stopCount"`
	Dock        string  `json:"dock"`
	DriverName  string  `json:"driverName"`
}

// TodayLoadsMeta contains shift metadata
type TodayLoadsMeta struct {
	Shift      string `json:"shift"`
	ShiftStart string `json:"shiftStart"`
	ShiftEnd   string `json:"shiftEnd"`
	Depot      string `json:"depot"`
	Date       string `json:"date"`
}

// TodayLoadsSummary contains count metrics across today's shift
type TodayLoadsSummary struct {
	TripsToday       int `json:"tripsToday"`
	AddedThisShift   int `json:"addedThisShift"`
	Loaded           int `json:"loaded"`
	InProgress       int `json:"inProgress"`
	Pending          int `json:"pending"`
	IssuesNeedReview int `json:"issuesNeedReview"`
}

// TodayLoadsResponse represents the response for GET /api/loading/trips
type TodayLoadsResponse struct {
	Meta    TodayLoadsMeta    `json:"meta"`
	Summary TodayLoadsSummary `json:"summary"`
	Trips   []TripItemDTO     `json:"trips"`
}

// FilterOptionsResponse represents the response for GET /api/loading/trips/filter-options
type FilterOptionsResponse struct {
	Docks    []string `json:"docks"`
	Statuses []string `json:"statuses"`
}

// TripsFilter captures query params for GET /api/loading/trips
type TripsFilter struct {
	Date     string
	Depot    string
	Docks    []string
	Statuses []string
	Q        string
	Limit    int
	Offset   int
}

type RouteOrderRequest struct {
	StopIDs []string `json:"stopIds"`
}

type RouteOrderResponse struct {
	Version int                 `json:"version"`
	Stops   []LoadStopDetailDTO `json:"stops"`
}

// ── Trip Detail API DTOs (Task P3) ──────────────────────────────────────────

type TripDetailHeader struct {
	TripCode    string `json:"tripCode"`
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	Status      string `json:"status"` // "Loading" | "Ready" | "Not Started" | "Issue"
}

type ReeferZone struct {
	TargetTempC  float64 `json:"targetTempC"`
	CurrentTempC float64 `json:"currentTempC"`
	Status       string  `json:"status"` // "Stable" | "Alert"
}

type TripDetailVehicle struct {
	VehicleID  string      `json:"vehicleId"`
	CapacityKg float64     `json:"capacityKg"`
	LoadedKg   float64     `json:"loadedKg"`
	LoadPct    int         `json:"loadPct"` // loadedKg / capacityKg
	ReeferZone *ReeferZone `json:"reeferZone"`
}

type TripDetailDriver struct {
	Name string `json:"name"`
}

type TripDetailTotals struct {
	Stops        int `json:"stops"`
	LineItems    int `json:"lineItems"`
	ItemsChecked int `json:"itemsChecked"` // CHECKED items (real DB count)
	ItemsTotal   int `json:"itemsTotal"`
	Exceptions   int `json:"exceptions"` // ISSUE items (real DB count)
}

const (
	NextActionLoadNext     = "LOAD_NEXT"
	NextActionStartLoading = "START_LOADING"
	NextActionViewItems    = "VIEW_ITEMS"
	NextActionDone         = "DONE"

	DropLabelFirstDrop = "FIRST DROP"
	DropLabelLastDrop  = "LAST DROP"
)

type LoadStopDetailDTO struct {
	StopID         string   `json:"stopId"`
	LoadOrder      int      `json:"loadOrder"`
	StopNo         int      `json:"stopNo"`
	DropLabel      *string  `json:"dropLabel"` // "FIRST DROP" | "LAST DROP" | null
	Outlet         string   `json:"outlet"`
	Area           string   `json:"area"`
	DockNote       string   `json:"dockNote"`
	ItemsRemaining int      `json:"itemsRemaining"` // PENDING count
	LineItems      int      `json:"lineItems"`
	Units          int      `json:"units"`
	Crates         int      `json:"crates"`
	WeightKg       float64  `json:"weightKg"`
	Tags           []string `json:"tags"`
	Status         string   `json:"status"`     // PENDING | LOADING | LOADED
	NextAction     string   `json:"nextAction"` // "LOAD_NEXT" | "START_LOADING" | "VIEW_ITEMS" | "DONE"
	ChangeFlag     *string  `json:"changeFlag"`
}

type TripDetailResponse struct {
	Header       TripDetailHeader    `json:"header"`
	Vehicle      TripDetailVehicle   `json:"vehicle"`
	Driver       TripDetailDriver    `json:"driver"`
	Dock         string              `json:"dock"`
	PlannedStart string              `json:"plannedStart"`
	Shift        string              `json:"shift"`
	Totals       TripDetailTotals    `json:"totals"`
	PlanBanner   any                 `json:"planBanner"`
	Stops        []LoadStopDetailDTO `json:"stops"`
	Version      int                 `json:"version"`
	Stale        bool                `json:"stale,omitempty"`
}

// ComputeLoadOrder computes the reverse loading order from delivery stop number.
func ComputeLoadOrder(stopNo, totalStops int) int {
	if totalStops <= 0 || stopNo <= 0 {
		return 1
	}
	order := totalStops - stopNo + 1
	if order < 1 {
		return 1
	}
	return order
}

// ComputeProgressPct calculates progress percentage from checked items and total items.
// progressPct = round(100 * CHECKED items / total items)
func ComputeProgressPct(checkedItems, totalItems int) int {
	if totalItems <= 0 {
		return 0
	}
	pct := int(float64(checkedItems)/float64(totalItems)*100.0 + 0.5)
	if pct < 0 {
		return 0
	}
	if pct > 100 {
		return 100
	}
	return pct
}

// ComputeLoadPct calculates weight load percentage from loadedKg and capacityKg.
func ComputeLoadPct(loadedKg, capacityKg float64) int {
	if capacityKg <= 0 {
		return 0
	}
	pct := int(loadedKg/capacityKg*100.0 + 0.5)
	if pct < 0 {
		return 0
	}
	if pct > 100 {
		return 100
	}
	return pct
}

// DeriveLoadingStatus calculates the UI status:
// - "Ready" when ready_at is set, even if the manifest contains an issue
// - "Issue" before ready_at when an open issue exists
// - "Ready" when confirmationStatus is LOADED/DEPARTED or every checklist line is reviewed
// - "Loading" only when actual checklist progress is between 1% and 99%
// - "Not Started" otherwise
func DeriveLoadingStatus(hasOpenIssues bool, confirmationStatus string, hasReadyAt bool, progressPct int) string {
	if hasReadyAt {
		return DerivedStatusReady
	}
	if hasOpenIssues {
		return DerivedStatusIssue
	}
	if confirmationStatus == LoadingStatusLoaded || confirmationStatus == LoadingStatusDeparted || progressPct >= 100 {
		return DerivedStatusReady
	}
	if progressPct > 0 {
		return DerivedStatusLoading
	}
	return DerivedStatusNotStarted
}

// EvaluateDepartureChecks applies the departure gate independently of display
// counters: ISSUE items count as reviewed and notified shortfalls are allowed.
func EvaluateDepartureChecks(pendingItems, unloadedStops, unnotifiedShortfalls []string) (bool, []string) {
	blockers := make([]string, 0, len(pendingItems)+len(unloadedStops)+len(unnotifiedShortfalls))
	for _, name := range pendingItems {
		blockers = append(blockers, "Pending item: "+name)
	}
	for _, name := range unloadedStops {
		blockers = append(blockers, "Stop not loaded: "+name)
	}
	for _, name := range unnotifiedShortfalls {
		blockers = append(blockers, "Dispatcher not notified: "+name)
	}
	return len(blockers) == 0, blockers
}

// DeriveStopNextAction calculates the nextAction for a stop according to business rules:
// - PENDING and startable -> START_LOADING
// - LOADING with itemsRemaining > 0 -> LOAD_NEXT
// - PENDING but blocked by sequence -> VIEW_ITEMS
// - LOADED -> DONE
func DeriveStopNextAction(status string, isStartable bool, itemsRemaining int) string {
	switch status {
	case "LOADED":
		return NextActionDone
	case "LOADING":
		if itemsRemaining > 0 {
			return NextActionLoadNext
		}
		return NextActionStartLoading
	default: // PENDING
		if isStartable {
			return NextActionStartLoading
		}
		return NextActionViewItems
	}
}

// DeriveReeferZone calculates refrigerated cargo telemetry:
// targetTempC 4 when trip has chilled items (-18 only if it has frozen items and no chilled)
// currentTempC is stubbed (or provided)
// status "Stable" | "Alert" by +/-2C
func DeriveReeferZone(hasChilled, hasFrozen bool, stubCurrentTemp float64) *ReeferZone {
	if !hasChilled && !hasFrozen {
		return nil
	}
	target := -18.0
	current := -17.5
	if hasChilled {
		target = 4.0
		current = 4.2
	}
	if stubCurrentTemp != 0 {
		current = stubCurrentTemp
	}
	status := "Stable"
	diff := current - target
	if diff < -2.0 || diff > 2.0 {
		status = "Alert"
	}
	return &ReeferZone{
		TargetTempC:  target,
		CurrentTempC: current,
		Status:       status,
	}
}

// ── P5: Item Checklist DTOs ─────────────────────────────────────────────────

type ChecklistProgress struct {
	Checked int    `json:"checked"`
	Total   int    `json:"total"`
	Pct     int    `json:"pct"`
	Label   string `json:"label"` // e.g. "4 of 5 checked"
}

type ChecklistItem struct {
	ItemID  string   `json:"itemId"`
	Name    string   `json:"name"`
	SKU     string   `json:"sku"`
	Tags    []string `json:"tags"`
	Qty     int      `json:"qty"`
	Unit    string   `json:"unit"`
	Status  string   `json:"status"` // PENDING | CHECKED | ISSUE
	Checked bool     `json:"checked"`
}

type ChecklistHeader struct {
	LoadOrder int     `json:"loadOrder"`
	StopNo    int     `json:"stopNo"`
	DropLabel *string `json:"dropLabel"`
	Outlet    string  `json:"outlet"`
	Area      string  `json:"area"`
	DockNote  string  `json:"dockNote"`
	VehicleID string  `json:"vehicleId"`
	LineItems int     `json:"lineItems"`
}

type StopItemsResponse struct {
	Header      ChecklistHeader   `json:"header"`
	Items       []ChecklistItem   `json:"items"`
	Progress    ChecklistProgress `json:"progress"`
	CanConfirm  bool              `json:"canConfirm"`
	BlockReason *string           `json:"blockReason"`
}

type CheckItemRequest struct {
	Checked bool `json:"checked"`
}

// ── P6: Flag Shortfall DTOs ─────────────────────────────────────────────────

type ShortfallContextItem struct {
	ItemID      string `json:"itemId"`
	Name        string `json:"name"`
	SKU         string `json:"sku"`
	ExpectedQty int    `json:"expectedQty"`
	Unit        string `json:"unit"`
}

type ShortfallContextDTO struct {
	TripCode   string `json:"tripCode"`
	VehicleID  string `json:"vehicleId"`
	Dock       string `json:"dock"`
	StopNo     int    `json:"stopNo"`
	ReportedBy string `json:"reportedBy"`
}

type ShortfallContextResponse struct {
	Items   []ShortfallContextItem `json:"items"`
	Context ShortfallContextDTO    `json:"context"`
}

type AffectedItemImpact struct {
	Name     string `json:"name"`
	SKU      string `json:"sku"`
	Expected int    `json:"expected"`
	Loaded   int    `json:"loaded"`
	Delta    int    `json:"delta"`
}

type ManifestImpact struct {
	StopQtyFrom         int     `json:"stopQtyFrom"`
	StopQtyTo           int     `json:"stopQtyTo"`
	ItemQtyFrom         int     `json:"itemQtyFrom"`
	ItemQtyTo           int     `json:"itemQtyTo"`
	ItemUnit            string  `json:"itemUnit"`
	WeightDeltaKg       float64 `json:"weightDeltaKg"`
	CapacityWithinLimit bool    `json:"capacityWithinLimit"`
}

// CountItemStates is the single item-counting rule used by API contracts:
// loaded means CHECKED only, exceptions means ISSUE, and total means every item.
func CountItemStates(statuses []string) (loaded, exceptions, total int) {
	for _, status := range statuses {
		total++
		switch status {
		case ItemStatusChecked:
			loaded++
		case ItemStatusIssue:
			exceptions++
		}
	}
	return loaded, exceptions, total
}

type CreateShortfallResponse struct {
	Ref                string             `json:"ref"`
	SentAt             time.Time          `json:"sentAt"`
	DispatcherNotified bool               `json:"dispatcherNotified"`
	AffectedItem       AffectedItemImpact `json:"affectedItem"`
	ChecklistUnlocked  bool               `json:"checklistUnlocked"`
	ManifestImpact     ManifestImpact     `json:"manifestImpact"`
}

type ShortfallDetailDTO struct {
	IssueID              string    `json:"issueId"`
	TripID               string    `json:"tripId"`
	OrderID              *string   `json:"orderId,omitempty"`
	StopID               *string   `json:"stopId,omitempty"`
	ItemID               *string   `json:"itemId,omitempty"`
	Ref                  string    `json:"ref"`
	IssueType            string    `json:"issueType"`
	QtyAffected          int       `json:"qtyAffected"`
	Reason               string    `json:"reason"`
	Description          string    `json:"description"`
	EvidenceURL          *string   `json:"evidenceUrl,omitempty"`
	WeightDeltaKg        float64   `json:"weightDeltaKg"`
	DispatcherNotifiedAt time.Time `json:"dispatcherNotifiedAt"`
	Resolved             bool      `json:"resolved"`
	FlaggedBy            string    `json:"flaggedBy"`
	ResolvedAt           *time.Time `json:"resolvedAt,omitempty"`
	ResolutionNotes      *string   `json:"resolutionNotes,omitempty"`
}

// ── P7: Departure DTOs ──────────────────────────────────────────────────────

// DepartureActivityEntry is one line in the chronological activity log.
type DepartureActivityEntry struct {
	Time        string `json:"time"` // HH:mm Asia/Colombo
	Type        string `json:"type"` // event_type from load_activity_log
	Title       string `json:"title"`
	Description string `json:"description"`
}

// DepartureLoadSummary aggregates live counts from the DB.
type DepartureLoadSummary struct {
	ItemsLoaded   int `json:"itemsLoaded"`   // CHECKED count across all stops
	ItemsTotal    int `json:"itemsTotal"`    // all items
	StopsComplete int `json:"stopsComplete"` // LOADED stop count
	StopsTotal    int `json:"stopsTotal"`
	IssuesFlagged int `json:"issuesFlagged"` // open (unresolved) issue_flags
}

// DepartureShortfall is a brief view of each flagged shortfall.
type DepartureShortfall struct {
	Item     string `json:"item"`
	Reason   string `json:"reason"`
	Qty      int    `json:"qty"`
	Ref      string `json:"ref"`
	Notified bool   `json:"notified"` // dispatcher_notified_at IS NOT NULL
}

// DepartureConfirmation summarises the pre-departure checklist state.
type DepartureConfirmation struct {
	ServerTimestamp string   `json:"serverTimestamp"` // RFC3339
	AllChecksPassed bool     `json:"allChecksPassed"`
	Blockers        []string `json:"blockers"`
}

// DepartureResponse is the full GET /departure payload.
type DepartureResponse struct {
	ActivityLog  []DepartureActivityEntry `json:"activityLog"`
	LoadSummary  DepartureLoadSummary     `json:"loadSummary"`
	Shortfalls   []DepartureShortfall     `json:"shortfalls"`
	Confirmation DepartureConfirmation    `json:"confirmation"`
	Status       string                   `json:"status"` // derived loading status
}

// MarkReadyResponse is returned by POST /mark-ready.
type MarkReadyResponse struct {
	TripCode       string    `json:"tripCode"`
	VehicleID      string    `json:"vehicleId"`
	ReadyAt        time.Time `json:"readyAt"`
	ReadyBy        string    `json:"readyBy"`
	ItemsLoaded    int       `json:"itemsLoaded"`
	ItemsTotal     int       `json:"itemsTotal"`
	IssuesFlagged  int       `json:"issuesFlagged"`
	DriverNotified bool      `json:"driverNotified"`
}
