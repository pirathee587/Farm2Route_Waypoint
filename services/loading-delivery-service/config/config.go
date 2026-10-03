package config

import (
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Config represents application configuration
type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	RabbitMQ RabbitMQConfig `yaml:"rabbitmq"`
	JWT      JWTConfig      `yaml:"jwt"`
	Supabase SupabaseConfig `yaml:"supabase"`
	Logging  LoggingConfig  `yaml:"logging"`
	DemoMode bool           `yaml:"demo_mode"`
}

type ServerConfig struct {
	HTTPPort string `yaml:"http_port"`
	GRPCPort string `yaml:"grpc_port"`
	Env      string `yaml:"env"`
}

type DatabaseConfig struct {
	Host            string `yaml:"host"`
	Port            string `yaml:"port"`
	Name            string `yaml:"name"`
	User            string `yaml:"user"`
	Password        string `yaml:"password"`
	SSLMode         string `yaml:"ssl_mode"`
	MaxOpenConns    int    `yaml:"max_open_conns"`
	MaxIdleConns    int    `yaml:"max_idle_conns"`
	ConnMaxLifetime int    `yaml:"conn_max_lifetime"` // seconds
}

// DSN returns the PostgreSQL connection string
func (d DatabaseConfig) DSN() string {
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		return dbURL
	}
	if d.Host == "" {
		d.Host = "localhost"
	}
	if d.Port == "" {
		d.Port = "5432"
	}
	if d.Name == "" {
		d.Name = "postgres"
	}
	if d.User == "" {
		d.User = "postgres"
	}
	if d.SSLMode == "" {
		d.SSLMode = "disable"
	}

	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.Name, d.SSLMode)
}

// MaxLifetimeDuration returns duration for connection lifetime
func (d DatabaseConfig) MaxLifetimeDuration() time.Duration {
	if d.ConnMaxLifetime <= 0 {
		return 20 * time.Minute
	}
	return time.Duration(d.ConnMaxLifetime) * time.Second
}

type RabbitMQConfig struct {
	URL         string            `yaml:"url"`
	Exchange    string            `yaml:"exchange"`
	Queues      map[string]string `yaml:"queues"`
	RoutingKeys map[string]string `yaml:"routing_keys"`
}

type JWTConfig struct {
	Secret string `yaml:"secret"`
	Issuer string `yaml:"issuer"`
}

type SupabaseConfig struct {
	URL            string `yaml:"url"`
	ServiceRoleKey string `yaml:"service_role_key"`
}

type LoggingConfig struct {
	Level string `yaml:"level"`
}

var envVarRegex = regexp.MustCompile(`\$\{([A-Za-z0-9_]+)(?::-(.*?))?\}`)

// expandEnv replaces ${VAR} or ${VAR:-default} with OS environment variable values
func expandEnv(content []byte) []byte {
	expanded := envVarRegex.ReplaceAllStringFunc(string(content), func(match string) string {
		submatches := envVarRegex.FindStringSubmatch(match)
		if len(submatches) < 2 {
			return match
		}
		varName := submatches[1]
		val, exists := os.LookupEnv(varName)
		if exists && val != "" {
			return val
		}
		if len(submatches) >= 3 && submatches[2] != "" {
			return submatches[2]
		}
		return ""
	})
	return []byte(expanded)
}

// Load loads and parses configuration from the specified yaml file path
func Load(path string) (*Config, error) {
	if path == "" {
		path = "config/config.yaml"
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file at %s: %w", path, err)
	}

	expanded := expandEnv(raw)

	var cfg Config
	if err := yaml.Unmarshal(expanded, &cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal yaml config: %w", err)
	}

	// Apply default values
	if cfg.Server.HTTPPort == "" {
		cfg.Server.HTTPPort = "8080"
	}
	if !strings.HasPrefix(cfg.Server.HTTPPort, ":") {
		cfg.Server.HTTPPort = ":" + cfg.Server.HTTPPort
	}
	if cfg.Server.GRPCPort == "" {
		cfg.Server.GRPCPort = "9090"
	}
	if !strings.HasPrefix(cfg.Server.GRPCPort, ":") {
		cfg.Server.GRPCPort = ":" + cfg.Server.GRPCPort
	}
	if cfg.Server.Env == "" {
		cfg.Server.Env = "development"
	}
	if cfg.Database.MaxOpenConns <= 0 {
		cfg.Database.MaxOpenConns = 10
	}
	if cfg.Database.MaxIdleConns <= 0 {
		cfg.Database.MaxIdleConns = 2
	}
	if cfg.Logging.Level == "" {
		cfg.Logging.Level = "info"
	}
	if dm := os.Getenv("DEMO_MODE"); dm != "" {
		cfg.DemoMode = strings.ToLower(dm) == "true" || dm == "1"
	}

	return &cfg, nil
}
