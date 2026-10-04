.PHONY: test test-docker test-db build build-docker run

# Local targets (if go is installed)
test:
	go test -v ./...

build:
	go build -o bin/server ./cmd/server

# Real DB verification: starts test postgres, initializes all migrations, runs integration tests
test-db:
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for test PostgreSQL to be healthy..."
	@docker run --rm --network loading-delivery-service_default \
		-v "$$(pwd):/app" -w /app \
		-e TEST_DATABASE_URL="postgres://postgres:postgrespassword@test-db:5432/waypoint_test?sslmode=disable" \
		golang:1.22-alpine \
		sh -c "go test -tags=integration -v ./internal/repository/..."

# Docker targets (uses golang:1.22-alpine)
test-docker:
	docker run --rm \
		-v "$$(pwd):/app" \
		-w /app \
		golang:1.22-alpine \
		sh -c "go mod tidy && go test -v ./..."

build-docker:
	docker run --rm \
		-v "$$(pwd):/app" \
		-w /app \
		golang:1.22-alpine \
		sh -c "go mod tidy && go build -o bin/server ./cmd/server"
