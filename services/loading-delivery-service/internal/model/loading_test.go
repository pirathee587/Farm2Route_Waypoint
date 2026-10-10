package model

import (
	"testing"
)

func TestDeriveLoadingStatus(t *testing.T) {
	tests := []struct {
		name          string
		hasOpenIssues bool
		confStatus    string
		hasReadyAt    bool
		progressPct   int
		expected      string
	}{
		{
			name:          "Issue status takes priority when open issue flag exists",
			hasOpenIssues: true,
			confStatus:    LoadingStatusLoading,
			hasReadyAt:    false,
			progressPct:   80,
			expected:      DerivedStatusIssue,
		},
		{
			name:          "Ready takes priority once ready_at is set even with an issue",
			hasOpenIssues: true,
			confStatus:    LoadingStatusLoaded,
			hasReadyAt:    true,
			progressPct:   100,
			expected:      DerivedStatusReady,
		},
		{
			name:          "Ready when confStatus is LOADED (TRC-189 / TRC-198)",
			hasOpenIssues: false,
			confStatus:    LoadingStatusLoaded,
			hasReadyAt:    true,
			progressPct:   100,
			expected:      DerivedStatusReady,
		},
		{
			name:          "Ready when hasReadyAt is true even if status string hasn't updated yet",
			hasOpenIssues: false,
			confStatus:    LoadingStatusLoading,
			hasReadyAt:    true,
			progressPct:   100,
			expected:      DerivedStatusReady,
		},
		{
			name:          "Progress 100% is Ready when the full checklist is reviewed",
			hasOpenIssues: false,
			confStatus:    LoadingStatusLoading,
			hasReadyAt:    false,
			progressPct:   100,
			expected:      DerivedStatusReady,
		},
		{
			name:          "Loading when progress > 0",
			hasOpenIssues: false,
			confStatus:    LoadingStatusLoading,
			hasReadyAt:    false,
			progressPct:   35,
			expected:      DerivedStatusLoading,
		},
		{
			name:          "Not Started when confStatus is LOADING but there is no real progress",
			hasOpenIssues: false,
			confStatus:    LoadingStatusLoading,
			hasReadyAt:    false,
			progressPct:   0,
			expected:      DerivedStatusNotStarted,
		},
		{
			name:          "Not Started when status is PENDING and 0 progress",
			hasOpenIssues: false,
			confStatus:    LoadingStatusPending,
			hasReadyAt:    false,
			progressPct:   0,
			expected:      DerivedStatusNotStarted,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := DeriveLoadingStatus(tc.hasOpenIssues, tc.confStatus, tc.hasReadyAt, tc.progressPct)
			if actual != tc.expected {
				t.Errorf("DeriveLoadingStatus(%v, %q, %v, %d) = %q; want %q",
					tc.hasOpenIssues, tc.confStatus, tc.hasReadyAt, tc.progressPct, actual, tc.expected)
			}
		})
	}
}

func TestEvaluateDepartureChecks(t *testing.T) {
	t.Run("checked and issue items with notified shortfalls pass", func(t *testing.T) {
		passed, blockers := EvaluateDepartureChecks(nil, nil, nil)
		if !passed || len(blockers) != 0 {
			t.Fatalf("passed=%v blockers=%v", passed, blockers)
		}
	})
	t.Run("names every real blocker", func(t *testing.T) {
		passed, blockers := EvaluateDepartureChecks([]string{"Milk crates"}, []string{"Keells Union Place"}, []string{"Yoghurt"})
		if passed {
			t.Fatal("expected checks to fail")
		}
		want := []string{"Pending item: Milk crates", "Stop not loaded: Keells Union Place", "Dispatcher not notified: Yoghurt"}
		for i := range want {
			if blockers[i] != want[i] {
				t.Fatalf("blockers=%v want=%v", blockers, want)
			}
		}
	})
}

func TestCountItemStatesCheckedOnlyIsLoaded(t *testing.T) {
	loaded, exceptions, total := CountItemStates([]string{ItemStatusChecked, ItemStatusChecked, ItemStatusIssue, ItemStatusPending})
	if loaded != 2 || exceptions != 1 || total != 4 {
		t.Fatalf("loaded=%d exceptions=%d total=%d; want 2,1,4", loaded, exceptions, total)
	}
}

func TestItemBasedProgressPct(t *testing.T) {
	tests := []struct {
		name         string
		checkedItems int
		totalItems   int
		expected     int
	}{
		{
			name:         "TRC-189 10/10 items checked returns 100",
			checkedItems: 10,
			totalItems:   10,
			expected:     100,
		},
		{
			name:         "TRC-198 10/10 items checked returns 100",
			checkedItems: 10,
			totalItems:   10,
			expected:     100,
		},
		{
			name:         "WPT-204 29/30 items checked returns 97",
			checkedItems: 29,
			totalItems:   30,
			expected:     97,
		},
		{
			name:         "TRC-211 0/15 items checked returns 0",
			checkedItems: 0,
			totalItems:   15,
			expected:     0,
		},
		{
			name:         "TRC-176 10/24 items checked returns 42",
			checkedItems: 10,
			totalItems:   24,
			expected:     42,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := ComputeProgressPct(tc.checkedItems, tc.totalItems)
			if actual != tc.expected {
				t.Errorf("ComputeProgressPct(%d, %d) = %d; want %d",
					tc.checkedItems, tc.totalItems, actual, tc.expected)
			}
		})
	}
}

func TestComputeLoadOrder(t *testing.T) {
	totalStops := 4

	tests := []struct {
		stopNo            int
		expectedLoadOrder int
		description       string
	}{
		{stopNo: 1, expectedLoadOrder: 4, description: "First delivery drop loaded last (near rear doors)"},
		{stopNo: 2, expectedLoadOrder: 3, description: "Second delivery drop loaded third"},
		{stopNo: 3, expectedLoadOrder: 2, description: "Third delivery drop loaded second"},
		{stopNo: 4, expectedLoadOrder: 1, description: "Final delivery drop loaded first (deep inside truck)"},
	}

	for _, tc := range tests {
		t.Run(tc.description, func(t *testing.T) {
			actual := ComputeLoadOrder(tc.stopNo, totalStops)
			if actual != tc.expectedLoadOrder {
				t.Errorf("ComputeLoadOrder(stop=%d, total=%d) = %d; want %d",
					tc.stopNo, totalStops, actual, tc.expectedLoadOrder)
			}
		})
	}
}

func TestDeriveStopNextAction(t *testing.T) {
	tests := []struct {
		name           string
		status         string
		isStartable    bool
		itemsRemaining int
		expected       string
	}{
		{
			name:           "LOADED stop is DONE",
			status:         "LOADED",
			isStartable:    false,
			itemsRemaining: 0,
			expected:       NextActionDone,
		},
		{
			name:           "LOADING stop with itemsRemaining > 0 is LOAD_NEXT",
			status:         "LOADING",
			isStartable:    true,
			itemsRemaining: 3,
			expected:       NextActionLoadNext,
		},
		{
			name:           "LOADING stop with 0 items remaining is START_LOADING",
			status:         "LOADING",
			isStartable:    true,
			itemsRemaining: 0,
			expected:       NextActionStartLoading,
		},
		{
			name:           "PENDING stop that is startable is START_LOADING",
			status:         "PENDING",
			isStartable:    true,
			itemsRemaining: 5,
			expected:       NextActionStartLoading,
		},
		{
			name:           "PENDING stop blocked by sequence is VIEW_ITEMS",
			status:         "PENDING",
			isStartable:    false,
			itemsRemaining: 5,
			expected:       NextActionViewItems,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := DeriveStopNextAction(tc.status, tc.isStartable, tc.itemsRemaining)
			if actual != tc.expected {
				t.Errorf("DeriveStopNextAction = %s; want %s", actual, tc.expected)
			}
		})
	}
}

func TestDeriveReeferZone(t *testing.T) {
	t.Run("Chilled items present sets targetTempC to 4", func(t *testing.T) {
		rz := DeriveReeferZone(true, true, 4.2)
		if rz == nil {
			t.Fatal("Expected reeferZone to be non-nil")
		}
		if rz.TargetTempC != 4.0 {
			t.Errorf("TargetTempC = %v; want 4.0", rz.TargetTempC)
		}
		if rz.Status != "Stable" {
			t.Errorf("Status = %s; want Stable", rz.Status)
		}
	})

	t.Run("Chilled items temperature alert when diff > 2C", func(t *testing.T) {
		rz := DeriveReeferZone(true, false, 6.5)
		if rz == nil {
			t.Fatal("Expected reeferZone to be non-nil")
		}
		if rz.Status != "Alert" {
			t.Errorf("Status = %s; want Alert", rz.Status)
		}
	})

	t.Run("Frozen only items sets targetTempC to -18", func(t *testing.T) {
		rz := DeriveReeferZone(false, true, -17.5)
		if rz == nil {
			t.Fatal("Expected reeferZone to be non-nil")
		}
		if rz.TargetTempC != -18.0 {
			t.Errorf("TargetTempC = %v; want -18.0", rz.TargetTempC)
		}
		if rz.Status != "Stable" {
			t.Errorf("Status = %s; want Stable", rz.Status)
		}
	})

	t.Run("Frozen items alert when temp warms by > 2C", func(t *testing.T) {
		rz := DeriveReeferZone(false, true, -15.0)
		if rz == nil {
			t.Fatal("Expected reeferZone to be non-nil")
		}
		if rz.Status != "Alert" {
			t.Errorf("Status = %s; want Alert", rz.Status)
		}
	})

	t.Run("Neither chilled nor frozen returns nil", func(t *testing.T) {
		rz := DeriveReeferZone(false, false, 0)
		if rz != nil {
			t.Errorf("Expected nil reeferZone for ambient cargo, got %+v", rz)
		}
	})
}
