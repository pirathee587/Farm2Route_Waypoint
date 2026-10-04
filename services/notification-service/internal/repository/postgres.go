package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresPool wraps a pgxpool.Pool with config-aware construction.
type PostgresPool struct {
	Pool *pgxpool.Pool
}

// DatabaseConfig is a minimal interface expected by NewPostgresPool.
// It is satisfied by config.DatabaseConfig.
type DatabaseConfig interface {
	DSN() string
	MaxLifetimeDuration() time.Duration
}

// NewPostgresPool creates a pgxpool.Pool from the provided database config.
func NewPostgresPool(ctx context.Context, cfg DatabaseConfig) (*PostgresPool, error) {
	dsn := cfg.DSN()
	if dsn == "" {
		return nil, fmt.Errorf("database DSN is empty — check environment variables")
	}

	poolCfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database DSN: %w", err)
	}
	poolCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	poolCfg.MaxConnLifetime = cfg.MaxLifetimeDuration()

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create postgres pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	return &PostgresPool{Pool: pool}, nil
}

// Close releases all connections in the pool.
func (p *PostgresPool) Close() {
	if p != nil && p.Pool != nil {
		p.Pool.Close()
	}
}
