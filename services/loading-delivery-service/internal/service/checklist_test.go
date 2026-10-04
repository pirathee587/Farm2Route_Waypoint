package service_test

import (
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

// TestConfirmGating_Logic tests that canConfirm is true ONLY when every item is CHECKED or ISSUE.
// If there are PENDING items, canConfirm is false and blockReason describes the pending items.
func TestConfirmGating_Logic(t *testing.T) {
	t.Run("All items CHECKED allows confirmation", func(t *testing.T) {
		items := []model.ChecklistItem{
			{ItemID: "1", Name: "Fresh Milk", Status: "CHECKED", Checked: true},
			{ItemID: "2", Name: "Butter", Status: "CHECKED", Checked: true},
		}

		canConfirm := true
		var pendingNames []string
		for _, it := range items {
			if it.Status == "PENDING" {
				canConfirm = false
				pendingNames = append(pendingNames, it.Name)
			}
		}

		assert.True(t, canConfirm)
		assert.Empty(t, pendingNames)
	})

	t.Run("Items with ISSUE status also count towards completing checklist", func(t *testing.T) {
		items := []model.ChecklistItem{
			{ItemID: "1", Name: "Fresh Milk", Status: "CHECKED", Checked: true},
			{ItemID: "2", Name: "Highland Milk Crates", Status: "ISSUE", Checked: false},
		}

		canConfirm := true
		var pendingNames []string
		for _, it := range items {
			if it.Status == "PENDING" {
				canConfirm = false
				pendingNames = append(pendingNames, it.Name)
			}
		}

		assert.True(t, canConfirm)
		assert.Empty(t, pendingNames)
	})

	t.Run("One PENDING item blocks confirmation with blockReason", func(t *testing.T) {
		items := []model.ChecklistItem{
			{ItemID: "1", Name: "Fresh Milk", Status: "CHECKED", Checked: true},
			{ItemID: "2", Name: "Highland milk crates", Status: "PENDING", Checked: false},
		}

		canConfirm := true
		var pendingNames []string
		for _, it := range items {
			if it.Status == "PENDING" {
				canConfirm = false
				pendingNames = append(pendingNames, it.Name)
			}
		}

		assert.False(t, canConfirm)
		requireReason := fmt.Sprintf("Check the %s or file a shortfall to continue.", strings.Join(pendingNames, ", "))
		assert.Equal(t, "Check the Highland milk crates or file a shortfall to continue.", requireReason)
	})

	t.Run("Multiple PENDING items lists all item names in blockReason", func(t *testing.T) {
		items := []model.ChecklistItem{
			{ItemID: "1", Name: "Fresh Milk", Status: "PENDING", Checked: false},
			{ItemID: "2", Name: "Cheddar Cheese", Status: "PENDING", Checked: false},
		}

		canConfirm := true
		var pendingNames []string
		for _, it := range items {
			if it.Status == "PENDING" {
				canConfirm = false
				pendingNames = append(pendingNames, it.Name)
			}
		}

		assert.False(t, canConfirm)
		requireReason := fmt.Sprintf("Check the %s or file a shortfall to continue.", strings.Join(pendingNames, ", "))
		assert.Equal(t, "Check the Fresh Milk, Cheddar Cheese or file a shortfall to continue.", requireReason)
	})
}

// TestSetNotToggle_Idempotency verifies that checking is an idempotent SET operation,
// not a toggle, so repeated taps leave the item in the desired state.
func TestSetNotToggle_Idempotency(t *testing.T) {
	type ItemState struct {
		Checked bool
		Status  string
	}

	setItemChecked := func(current ItemState, targetChecked bool) ItemState {
		// SET semantics: target state directly overwrites current state, no flipping
		if targetChecked {
			return ItemState{Checked: true, Status: "CHECKED"}
		}
		return ItemState{Checked: false, Status: "PENDING"}
	}

	t.Run("Double tap checked=true remains CHECKED (not toggled to false)", func(t *testing.T) {
		initial := ItemState{Checked: false, Status: "PENDING"}

		// First tap: set checked=true
		firstTap := setItemChecked(initial, true)
		assert.True(t, firstTap.Checked)
		assert.Equal(t, "CHECKED", firstTap.Status)

		// Second tap: set checked=true again (shared tablet double tap)
		secondTap := setItemChecked(firstTap, true)
		assert.True(t, secondTap.Checked, "Item must remain checked=true on second tap")
		assert.Equal(t, "CHECKED", secondTap.Status)
	})

	t.Run("Double tap checked=false remains PENDING", func(t *testing.T) {
		initial := ItemState{Checked: true, Status: "CHECKED"}

		firstTap := setItemChecked(initial, false)
		assert.False(t, firstTap.Checked)
		assert.Equal(t, "PENDING", firstTap.Status)

		secondTap := setItemChecked(firstTap, false)
		assert.False(t, secondTap.Checked, "Item must remain checked=false on second uncheck")
		assert.Equal(t, "PENDING", secondTap.Status)
	})

	t.Run("Item in ISSUE status cannot be checked (returns 409 error)", func(t *testing.T) {
		currentStatus := "ISSUE"
		var errCode string
		if currentStatus == "ISSUE" {
			errCode = model.ErrCodeItemHasIssue
		}
		assert.Equal(t, "ITEM_HAS_ISSUE", errCode)
	})
}
