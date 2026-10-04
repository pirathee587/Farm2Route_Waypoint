package config

import (
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Config represents the full application configuration for the notification service.
type Config struct {
	Server    ServerConfig    `yaml:"server"`
	Database  DatabaseConfig  `yaml:"database"`
	RabbitMQ  RabbitMQConfig  `yaml:"rabbitmq"`
	JWT       JWTConfig       `yaml:"jwt"`
	Supabase  SupabaseConfig  `yaml:"supabase"`
	WebSocket WebSocketConfig `yaml:"websocket"`
	Logging   LoggingConfig   `yaml:"logging"`
}

type ServerConfig struct {
	HTTPPort string `yaml:"http_port"`
	WSPath   string `yaml:"ws_path"`
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

// DSN returns a PostgreSQL connection string, preferring DATABASE_URL env var.
func (d DatabaseConfig) DSN() string {
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
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

// MaxLifetimeDuration returns the connection maximum lifetime as a duration.
func (d DatabaseConfig) MaxLifetimeDuration() time.Duration {
	if d.ConnMaxLifetime <= 0 {
		return 20 * time.Minute
	}
	return time.Duration(d.ConnMaxLifetime) * time.Second
}

type RabbitMQConfig struct {
	URL      string            `yaml:"url"`
	Exchange string            `yaml:"exchange"`
	Queues   map[string]string `yaml:"queues"`
}

type JWTConfig struct {
	Secret string `yaml:"secret"`
	Issuer string `yaml:"issuer"`
}

type SupabaseConfig struct {
	URL            string `yaml:"url"`
	ServiceRoleKey string `yaml:"service_role_key"`
}

type WebSocketConfig struct {
	ReadBufferSize  int `yaml:"read_buffer_size"`
	WriteBufferSize int `yaml:"write_buffer_size"`
	PingIntervalSec int `yaml:"ping_interval_sec"`
	PongWaitSec     int `yaml:"pong_wait_sec"`
}

// PingInterval returns the configured ping interval (defaults to 30s).
func (w WebSocketConfig) PingInterval() time.Duration {
	if w.PingIntervalSec <= 0 {
		return 30 * time.Second
	}
	return time.Duration(w.PingIntervalSec) * time.Second
}

// PongWait returns the configured pong wait timeout (defaults to 60s).
func (w WebSocketConfig) PongWait() time.Duration {
	if w.PongWaitSec <= 0 {
		return 60 * time.Second
	}
	return time.Duration(w.PongWaitSec) * time.Second
}

type LoggingConfig struct {
	Level string `yaml:"level"`
}

var envVarRegex = regexp.MustCompile(`\$\{([A-Za-z0-9_]+)(?::-(.*?))?\}`)

// expandEnv replaces ${VAR} or ${VAR:-default} placeholders with OS env values.
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

// Load reads, expands env vars in, and unmarshals the YAML config file.
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

	// Apply defaults
	if cfg.Server.HTTPPort == "" {
		cfg.Server.HTTPPort = "8080"
	}
	if !strings.HasPrefix(cfg.Server.HTTPPort, ":") {
		cfg.Server.HTTPPort = ":" + cfg.Server.HTTPPort
	}
	if cfg.Server.WSPath == "" {
		cfg.Server.WSPath = "/ws"
	}
	if cfg.Server.Env == "" {
		cfg.Server.Env = "development"
	}
	if cfg.Database.MaxOpenConns <= 0 {
		cfg.Database.MaxOpenConns = 5
	}
	if cfg.Database.MaxIdleConns <= 0 {
		cfg.Database.MaxIdleConns = 2
	}
	if cfg.WebSocket.ReadBufferSize <= 0 {
		cfg.WebSocket.ReadBufferSize = 1024
	}
	if cfg.WebSocket.WriteBufferSize <= 0 {
		cfg.WebSocket.WriteBufferSize = 1024
	}
	if cfg.Logging.Level == "" {
		cfg.Logging.Level = "info"
	}
	if cfg.RabbitMQ.Exchange == "" {
		cfg.RabbitMQ.Exchange = "waypoint.events"
	}

	return &cfg, nil
}
