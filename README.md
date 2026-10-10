# Farm2Route Waypoint

Farm2Route Waypoint is a database-backed delivery operations platform for Store Managers, Dispatchers, Loaders, and Drivers. The stack uses React, a .NET API Gateway and Auth service, Java Order and Planning services, Go Loading/Delivery and Notification services, PostgreSQL, RabbitMQ, and Mapbox.

See [docs/architecture.md](docs/architecture.md) for the system map and [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker and troubleshooting instructions.

## Languages and technology stack

| Language / format | Where it is used | Main technology |
|---|---|---|
| TypeScript / TSX | Browser frontend and UI components | React 18, Vite 5, React Router, Mapbox GL |
| CSS | Responsive Store Manager, Dispatcher, Loader, and Driver interfaces | Native CSS |
| C# | Authentication and API routing | .NET 8, ASP.NET Core, Entity Framework Core, YARP |
| Java | Order management, planning, allocation, and validation | Java 21, Spring Boot 3.2, Spring Data JPA, Maven |
| Go | Loading, delivery, Driver APIs, notifications, and background workers | Go 1.22, pgx, gRPC, RabbitMQ |
| SQL / PL/pgSQL | Database schema, migrations, seed data, constraints, and database functions | PostgreSQL 16 / Supabase-compatible schema |
| Protocol Buffers | Typed service-to-service contracts | gRPC / Protobuf 3 |
| Python | Data-science and allocation research utilities under `ml-datathon` | Python notebooks and modules |
| YAML | Docker Compose, application configuration, and service settings | Docker Compose and service config |
| PowerShell / shell scripts | Local setup, verification, and container automation | PowerShell and POSIX shell |

The application is a polyglot microservice system: the frontend is TypeScript, core business services use C#, Java, and Go, and all roles share PostgreSQL as the source of truth.

## Run locally with Docker

Requirements: Docker Desktop with Docker Compose v2.

From the repository root:

```powershell
Copy-Item .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
```

Open the application in Chrome at <http://localhost:3000>. Frontend requests use same-origin `/api` routes through the API Gateway; backend containers are intentionally not exposed to the host.

Do not commit `.env`. At minimum, replace the local PostgreSQL password, RabbitMQ password, and JWT secret. Maps require both values below, followed by a rebuild:

```dotenv
VITE_MAPBOX_TOKEN=your_public_mapbox_token
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

```powershell
docker compose up -d --build frontend loading-delivery-service
```

## Seeded local accounts

All seeded accounts use password `Waypoint@2026`.

| Email | Role |
|---|---|
| `manager@waypoint.lk` | Store Manager (`OUT001`) |
| `dispatcher@waypoint.lk` | Dispatcher |
| `loader@waypoint.lk` | Loader |
| `driver@waypoint.lk` | Driver |
| `drv014@waypoint.lk` | Driver (`DRV014`) |

## Operational workflow

1. Store Manager places an order. Dispatcher sees the same database order in the Order Queue.
2. Dispatcher builds a trip and selects a suitable vehicle and driver.
3. Trip confirmation sends the trip to both Loader and Driver workflows.
4. Loader records real item progress or a loading shortfall and marks the load ready.
5. Driver sees the assigned trip, vehicle, stops, notifications, Mapbox road route, and live location when browser GPS permission is available.
6. `I've Arrived` records arrival without requiring proof files. Dispatcher Live Tracking shows `ARRIVED`, and Store Manager tracking changes to `out_for_delivery`.
7. `Can't Deliver` records a deferral, creates a Dispatcher review item, marks Live Tracking as `NOT_DELIVERED`/issue, and changes Store Manager tracking to delayed `delivery_attempted` with the reported reason.

Operational data is stored in PostgreSQL. Driver, Loader, Dispatcher, and Store Manager screens do not use frontend demo records for these workflows.

## Fleet and validation

The local active fleet contains 10 database vehicles. Three are intentionally marked operationally unavailable so the Dispatcher can demonstrate a validation failure. The remaining vehicles continue to use the normal rules:

- Maximum 2 trips per vehicle per delivery date
- Weight and volume capacity
- Temperature/refrigeration suitability
- Vehicle and order brand suitability
- Home depot compatibility
- Restricted-outlet van access
- Delivery windows, fuel quota, duplicate allocation, and availability

Inactive historical vehicle rows are retained in PostgreSQL for referential integrity but are excluded from the selectable fleet.

## Main routes

| Role/workflow | Route |
|---|---|
| Store Manager dashboard | `/store-manager` |
| Create order | `/store-manager/orders/new` |
| Order history/details | `/store-manager/orders` |
| Store delivery tracking | `/store-manager/orders/{id}/tracking` |
| Receiving | `/store-manager/receiving` |
| Dispatcher dashboard | `/dispatcher` |
| Dispatcher order queue | `/dispatcher/orders` |
| Route planning | `/dispatcher/planning` |
| Loading visibility | `/dispatcher/loading` |
| Live Tracking | `/dispatcher/tracking` |

Driver and Loader portals are selected automatically after login based on the authenticated role.

## Database initialization

On a fresh PostgreSQL volume, Compose applies `supabase/test_bootstrap.sql` and the ordered SQL files in `supabase/migrations`. Application-specific Flyway/EF migrations then apply service-owned additions.

`docker compose down` preserves named volumes. Do not use `docker compose down --volumes` unless you deliberately want to delete the local database, RabbitMQ state, and uploaded files.

## Useful commands

```powershell
docker compose ps
docker compose logs --tail=200 loading-delivery-service
docker compose logs --tail=200 planning-service
docker compose up -d --build frontend
docker compose stop
docker compose down
```

If the UI looks cached after rebuilding, use `Ctrl + Shift + R` in Chrome.

## Git

Run Git commands from the repository directory, not its parent:

```powershell
cd C:\Users\DELL\Desktop\Farm2Route\Farm2Route_Waypoint
git remote -v
git status
```

The expected origin is `https://github.com/pirathee587/Farm2Route_Waypoint.git`.
