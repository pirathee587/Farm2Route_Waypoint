# ═══════════════════════════════════════════════════════════════════════════
#  Loading & Delivery Service — Multi-stage Dockerfile
#  Go 1.22 build → gcr.io/distroless/static (minimal, no shell)
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go.mod & go.sum first for dependency cache
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy all source
COPY . .

# Build statically linked binary — CGO disabled for distroless compatibility
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -X main.version=$(git describe --tags --always --dirty 2>/dev/null || echo dev)" \
    -trimpath \
    -o /out/server \
    ./cmd/server

# ── Stage 2: Runtime (distroless — no shell, minimal attack surface) ──────
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

# Copy TZ data and CA certs from build stage
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=build /out/server /server

# Copy config
COPY config/config.yaml /config/config.yaml

EXPOSE 8080
# gRPC port
EXPOSE 9090

# distroless nonroot image runs as uid 65532 by default
USER nonroot:nonroot

ENV TZ=Asia/Colombo

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD ["/server", "-healthcheck"]

ENTRYPOINT ["/server"]
