package config

import (
	"os"
	"testing"
)

func TestExpandEnv(t *testing.T) {
	_ = os.Setenv("TEST_WAYPOINT_PORT", "8888")
	defer func() { _ = os.Unsetenv("TEST_WAYPOINT_PORT") }()

	input := []byte(`
server:
  port: "${TEST_WAYPOINT_PORT}"
  fallback: "${UNSET_VAR:-default_val}"
  empty: "${ANOTHER_UNSET}"
`)

	expanded := string(expandEnv(input))

	if !contains(expanded, `port: "8888"`) {
		t.Errorf("expected port: \"8888\", got: %s", expanded)
	}
	if !contains(expanded, `fallback: "default_val"`) {
		t.Errorf("expected fallback: \"default_val\", got: %s", expanded)
	}
	if !contains(expanded, `empty: ""`) {
		t.Errorf("expected empty: \"\", got: %s", expanded)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (len(s) > 0 && indexOf(s, substr) >= 0))
}

func indexOf(s, substr string) int {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
