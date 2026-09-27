# Waypoint Delivery Planning System — Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERNET / CLIENT                          │
│              (Browser / Mobile PWA / Driver App)                    │
└─────────────────────────┬───────────────────────────────────────────┘
                          │  HTTPS :443 / WSS
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NGINX  (Port 443)                              │
│                                                                     │
│   • SSL/TLS Termination  (TLSv1.2 + TLSv1.3)                       │
│   • HTTP :80 → HTTPS :443 redirect                                  │
│   • Serves React SPA  (static /dist)                                │
│   • /api/**  → proxy_pass → API Gateway :8080                       │
│   • /api/notify/ws → WebSocket upgrade → API Gateway :8080          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │  HTTP (internal Docker network)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   API GATEWAY  (.NET 8 YARP)                        │
│                        Port 8080                                    │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              JwtValidationMiddleware                        │   │
│   │  • Validates Bearer token (signature + expiry + issuer)     │   │
│   │  • Strips client X-User-* headers (anti-spoofing)           │   │
│   │  • Injects: X-User-Id, X-User-Role, X-User-Email           │   │
│   │  • Adds:    X-Gateway-Verified: true                        │   │
│   │  • Public routes bypassed: /api/auth/login, /api/auth/refresh│  │
│   │  • Invalid token → 401 JSON (YARP never called)             │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                      │
│              YARP Route Table (from appsettings.json)               │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │  /api/auth/**      →  auth-service:8080                      │ │
│   │  /api/orders/**    →  order-service:8080                     │ │
│   │  /api/outlets/**   →  order-service:8080                     │ │
│   │  /api/vehicles/**  →  order-service:8080                     │ │
│   │  /api/planning/**  →  planning-service:8080                  │ │
│   │  /api/loading/**   →  loading-delivery-service:8080          │ │
│   │  /api/delivery/**  →  loading-delivery-service:8080          │ │
│   │  /api/notify/ws    →  notification-service:8080 (WebSocket)  │ │
│   │  /api/notify/**    →  notification-service:8080              │ │
│   └───────────────────────────────────────────────────────────────┘ │
└────┬──────────┬──────────┬──────────┬──────────┬────────────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
│  AUTH   │ │ ORDER  │ │PLANNING│ │LOADING │ │NOTIFICATION  │
│SERVICE  │ │SERVICE │ │SERVICE │ │SERVICE │ │SERVICE       │
│.NET 8   │ │Spring  │ │Spring  │ │Go 1.22 │ │Go 1.22       │
│:8080    │ │Boot 21 │ │Boot 21 │ │:8080   │ │:8080 + WS    │
│:9090gRPC│ │:8080   │ │:8080   │ │:9090   │ │              │
└────┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └──────┬───────┘
     │          │          │          │              │
     └──────────┴──────────┴──────────┴──────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌──────────────────┐     ┌─────────────────────┐
    │    SUPABASE      │     │      RABBITMQ        │
    │  (PostgreSQL)    │     │   (Message Broker)   │
    │                  │     │                      │
    │  public schema   │     │  Exchanges/Queues:   │
    │  • user_profiles │     │  ORDER_PLACED        │
    │  • outlets       │     │  ORDER_DEFERRED      │
    │  • vehicles      │     │  ALLOCATION_COMPLETED│
    │  • orders        │     │  DELIVERY_COMPLETED  │
    │  • trips         │     │  FLAG_RAISED         │
    │  • allocations   │     │                      │
    │  • deferral_recs │     │  Management UI:      │
    │  • delivery_recs │     │  :15672              │
    │  • notifications │     └─────────────────────┘
    │                  │
    │  + Row Level     │
    │    Security (RLS)│
    └──────────────────┘
```

---

## Service Responsibilities

| Service | Language | Port | Responsibility |
|---------|----------|------|----------------|
| **NGINX** | nginx:alpine | 80, 443 | SSL termination, SPA serving, reverse proxy |
| **API Gateway** | .NET 8 YARP | 8080 | JWT validation, routing, anti-spoofing |
| **Auth Service** | .NET 8 | 5001→8080 | Login, JWT issuance, user profiles (Supabase Auth) |
| **Order Service** | Spring Boot 21 | 5003→8080 | Orders, outlets, vehicles, calendar, 4PM cutoff |
| **Planning Service** | Spring Boot 21 | 5002→8080 | Allocation engine, constraint validation, trip management |
| **Loading & Delivery** | Go 1.22 | 5004→8080 | Loader checklist, driver delivery, offline sync |
| **Notification Service** | Go 1.22 | 5005→8080 | WebSocket broadcasts, RabbitMQ event fan-out |
| **Supabase** | PostgreSQL | cloud | Shared DB, Auth, RLS, Storage (POD images) |
| **RabbitMQ** | 3.13 | 5672, 15672 | Async event bus between services |

---

## Communication Patterns

### Synchronous — REST (via Gateway)
```
Frontend → NGINX → API Gateway → Service → Supabase
```
All REST calls flow through the gateway. JWT is validated **once** at the gateway.
Backend services trust `X-User-*` headers — no re-validation.

### Synchronous — gRPC (service-to-service)
```
Planning Service ──gRPC──► Order Service      (get orders, outlets, vehicles)
Loading Service  ──gRPC──► Planning Service   (get trip details)
```

### Asynchronous — RabbitMQ Events
```
Order Service     ──[ORDER_PLACED]──────────────► Planning Service
Planning Service  ──[ORDER_DEFERRED]────────────► Notification Service → STORE_MANAGER, DISPATCHER
Planning Service  ──[ALLOCATION_COMPLETED]──────► Notification Service → LOADER
Loading Service   ──[DELIVERY_COMPLETED]────────► Notification Service → STORE_MANAGER, DISPATCHER
Loading Service   ──[FLAG_RAISED]────────────────► Notification Service → DISPATCHER
```

### Real-time — WebSocket
```
Frontend (all roles) ←──WebSocket (wss://localhost/api/notify/ws)──── Notification Service
```
Notification service maintains a connection pool filtered by `X-User-Role`.
Broadcasts are fan-out to all connected clients of the target role.

---

## JWT Security Flow

```
1. Client sends:  POST /api/auth/login  { email, password }
                  (Public route — bypasses JWT check)
                          │
2. Auth Service validates credentials via Supabase Auth
   Returns: { access_token, refresh_token, expires_at }
                          │
3. Client stores token, sends on every request:
   Authorization: Bearer <JWT>
                          │
4. API Gateway — JwtValidationMiddleware:
   ✅ Valid  → inject X-User-* headers → YARP forwards
   ❌ Expired → 401 { "error": "Token has expired. Please refresh." }
   ❌ Invalid → 401 { "error": "Invalid token." }
                          │
5. Backend services read X-User-Id, X-User-Role from headers
   (Never see the raw JWT — gateway strips Authorization header)
```

---

## Deployment Architecture (Docker Compose)

```
waypoint-network (bridge)
│
├── waypoint-nginx          (ports: 80, 443)
├── waypoint-gateway        (port: 8080 internal)
├── waypoint-auth           (port: 5001 external)
├── waypoint-order          (port: 5003 external)
├── waypoint-planning       (port: 5002 external)
├── waypoint-loading        (port: 5004 external)
├── waypoint-notification   (port: 5005 external)
└── waypoint-rabbitmq       (ports: 5672, 15672)

External: Supabase Cloud PostgreSQL
```

### Startup Order (health-check gated)
```
rabbitmq (healthy)
    └──► auth-service (healthy)
    └──► order-service (healthy)
    └──► planning-service (healthy)
    └──► loading-delivery-service (healthy)
    └──► notification-service (healthy)
              └──► api-gateway (healthy)
                        └──► nginx
```

---

## Technology Choices Rationale

| Choice | Reason |
|--------|--------|
| **.NET YARP** | Native .NET, easy JWT middleware, config-driven routing |
| **Spring Boot (Java 21)** | Mature JPA ecosystem, Flyway migrations, virtual threads |
| **Go (distroless)** | ~15MB container, high concurrency for WS + RabbitMQ consumer |
| **Supabase** | Managed Postgres + Auth + RLS + Storage — zero infra setup |
| **RabbitMQ** | Reliable message delivery, management UI, dead-letter queues |
| **gRPC** | Type-safe, efficient binary protocol for internal service calls |
| **NGINX** | Battle-tested SSL termination, WebSocket proxy, static file serving |
| **React FSD** | Feature-Sliced Design scales well for multi-role dashboards |
