# ═══════════════════════════════════════════════════════════════════════════
#  Notification Service — Multi-stage Dockerfile
#  Go 1.22 build → gcr.io/distroless/static (WebSocket + RabbitMQ consumer)
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS build
WORKDIR /app

# Build tools
RUN apk add --no-cache git ca-certificates tzdata

# Dependency cache layer
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source
COPY . .

# Statically compiled binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -X main.version=$(git describe --tags --always --dirty 2>/dev/null || echo dev)" \
    -trimpath \
    -o /out/server \
    ./cmd/server

# ── Stage 2: Runtime (distroless — no shell) ──────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

# TZ + CA certs
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Binary
COPY --from=build /out/server /server

# Config
COPY config/config.yaml /config/config.yaml

# HTTP + WebSocket port
EXPOSE 8080

USER nonroot:nonroot

ENV TZ=Asia/Colombo

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD ["/server", "-healthcheck"]

ENTRYPOINT ["/server"]
