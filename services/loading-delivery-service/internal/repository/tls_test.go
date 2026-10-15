package repository

import (
	"context"
	"github.com/waypoint/loading-delivery-service/config"
	"strings"
	"testing"
)

func TestDatabaseUrlCannotDisableCertificateValidation(t *testing.T) {
	for _, mode := range []string{"disable", "prefer", "require", "verify-ca"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("DATABASE_URL", "postgres://fixture:fixture@localhost:1/test?sslmode="+mode)
			_, err := NewPostgresPool(context.Background(), config.DatabaseConfig{})
			if err == nil || !strings.Contains(err.Error(), "verify-full") {
				t.Fatalf("expected TLS rejection, got %v", err)
			}
		})
	}
}
