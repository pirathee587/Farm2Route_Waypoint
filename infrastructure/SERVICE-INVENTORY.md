# Source-verified service contracts

All HTTP ports below are container ports, not the older Compose published host ports.
The repository has two Compose files with differing settings; neither was overwritten.

| Service | Build context / Dockerfile | HTTP health | gRPC |
|---|---|---|---|
| api-gateway | services/api-gateway / Dockerfile | 8080 /health | None |
| auth-service | services/auth-service / Dockerfile; builds src/Auth.Api | 8080 /health | No running server found in built entry point |
| order-service | repository root / services/order-service/Dockerfile | 8080 /actuator/health | Server 9090; planning client |
| planning-service | repository root / services/planning-service/Dockerfile | 8080 /actuator/health | Server 9090; optional order client; default master-data mode jdbc |
| loading-delivery-service | services/loading-delivery-service / Dockerfile | 8080 /health | Planning client; no running 9090 server found despite Docker EXPOSE |
| notification-service | services/notification-service / Dockerfile | 8080 /health | None; WebSocket /api/notify/ws |

YARP destinations use Kubernetes Service names matching existing Compose names.
Auth issues symmetric JWTs; gateway validates issuer/audience/signature and forwards user
headers plus X-Gateway-Verified. Backends trusting those headers must remain private.
Go loading client uses JSON gRPC whereas Java planning uses generated protobuf; compatibility
must be tested/fixed before claiming delivery workflows work.

## Configuration and Secrets

Non-secret shared configuration is in kubernetes/configmap.yaml. Service-specific Secret
references are mandatory and intentionally have no supplied values.

| Secret | Required keys / meaning |
|---|---|
| api-gateway-secrets | JWT_SECRET, mapped to Jwt__Secret |
| auth-service-secrets | SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, JWT_SECRET |
| order-service-secrets | Same five DB keys; RABBITMQ_USER, RABBITMQ_PASSWORD |
| planning-service-secrets | Same five DB keys; RABBITMQ_USER, RABBITMQ_PASSWORD |
| loading-delivery-service-secrets | Same five DB keys; JWT_SECRET, RABBITMQ_URL; MAPBOX_ACCESS_TOKEN for routing; SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only if Supabase storage is selected after fixes |
| notification-service-secrets | Same five DB keys; JWT_SECRET, RABBITMQ_URL; Supabase storage keys only if future code requires them |
| rabbitmq-secrets | RABBITMQ_USER, RABBITMQ_PASSWORD; match client credentials |

The DB host/port/name are not authentication secrets themselves but are placed in the
per-service Secret to keep deployment-specific connection details together. SQL users
must have only service-specific privileges. URI-encode RabbitMQ username/password in
RABBITMQ_URL; use vhost `waypoint`. DB TLS certificate verification needs the application
changes documented in SECURITY-REVIEW.md. No production secrets are generated or printed.

Additional inputs: JWT_ISSUER/JWT_AUDIENCE (and gateway Jwt__ equivalents),
Cors__AllowedOrigins__0/1, PLANNING_GRPC_ADDR, ORDER_SERVICE_GRPC_HOST/PORT,
PLANNING_SERVICE_GRPC_HOST/PORT. Config disables Java Flyway and order seed execution;
migrations must be independently reviewed. Auth's unconditional startup seeding cannot
be disabled by these variables today. Do not point this draft at a production DB.

## RabbitMQ

Durable topic exchange: `waypoint.events`; development vhost: `waypoint`.
Java queue/routing definitions are in each application.yml and Rabbit configuration class.
- Planning: order.placed, order.deferred, allocation.completed.
- Orders: allocation.completed, order-service.order-deferred,
  order-service.delivery-completed, order-service.loading-completed.
- Loading: loading.allocation with loading.allocation.dlq; loading.driver-notifications
  with loading.driver-notifications.dlq, plus outbox publication.
- Notification derives durable queue names notification.order.deferred,
  notification.allocation.completed, notification.delivery.completed,
  notification.flag.raised and notification.driver.notification from dotted routing keys.
  Its fallback map omits driver.notification; verify configuration loading and delivery.
- Dead-letter exchanges include waypoint.dlx and the loading allocation consumer's DLX.

Inspect durable declarations and message publisher confirms/outbox behavior during isolated
integration tests. Persistence alone does not prove at-least-once processing or recovery.
RabbitMQ 4.1.4 is a proposed fresh dev broker image, not an upgrade of the existing 3.13
volume. Compatibility and image support/security scans are release prerequisites.

## Persistence

Supabase PostgreSQL remains external. Java Flyway and Auth schema creation/seeding exist.
Loading local storage writes relative `uploads/shortfalls`; container workingDir `/` and
PVC `/uploads` align that path. UPLOAD_DIR alone does not control the inspected storage
factory. Returning /uploads URLs is not sufficient: the Go/YARP source has no verified
serving route for these files. Supabase UploadPOD performs HTTP upload, whereas
UploadShortfallPhoto currently only returns a path. No S3 adapter exists.

RabbitMQ data is persistent. Other five service containers are stateless. Temporary /tmp
volumes support .NET and Java with read-only root filesystems; all app pods run as UID
65532. RabbitMQ uses UID/GID 999; image/runtime behavior still requires validation.
