package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

func TestNormalizeStopsUsesReverseLoadOrder(t *testing.T) {
	tripID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	stops, err := normalizeStops(tripID, []model.AllocationStop{
		{Sequence: 1, OutletID: "OUT-A", Outlet: "Outlet A"},
		{Sequence: 2, OutletID: "OUT-B", Outlet: "Outlet B"},
		{Sequence: 3, OutletID: "OUT-C", Outlet: "Outlet C"},
	})
	if err != nil {
		t.Fatal(err)
	}
	for i, want := range []int{3, 2, 1} {
		if stops[i].LoadOrder != want {
			t.Fatalf("stop %d loadOrder=%d want=%d", i, stops[i].LoadOrder, want)
		}
	}
}

func TestClassifyPlanChanges(t *testing.T) {
	previous := []model.PlanStopSnapshot{{OutletID: "A", Sequence: 1}, {OutletID: "B", Sequence: 2}}
	updated := []model.PlanStopSnapshot{{OutletID: "B", Sequence: 1}, {OutletID: "C", Sequence: 2}}
	classifyChanges(previous, updated)
	if previous[0].Change != "REMOVED" {
		t.Fatalf("A change=%q", previous[0].Change)
	}
	if updated[0].Change != "REORDERED" {
		t.Fatalf("B change=%q", updated[0].Change)
	}
	if updated[1].Change != "NEW" {
		t.Fatalf("C change=%q", updated[1].Change)
	}
}

func TestNormalizeStopsRejectsDuplicateSequence(t *testing.T) {
	_, err := normalizeStops(uuid.New(), []model.AllocationStop{{Sequence: 1, OutletID: "A", Outlet: "A"}, {Sequence: 1, OutletID: "B", Outlet: "B"}})
	if err == nil {
		t.Fatal("expected duplicate sequence error")
	}
}
