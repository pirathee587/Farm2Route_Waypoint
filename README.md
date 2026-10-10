# 🚚 Farm2Route Waypoint — Delivery Operations Platform

<div align="center">

![Farm2Route](https://img.shields.io/badge/Farm2Route-Waypoint-2563EB?style=for-the-badge)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)

**A database-backed delivery operations platform connecting Store Managers, Dispatchers, Loaders, and Drivers.**

</div>

## Project overview

Farm2Route Waypoint manages the complete delivery workflow, from store order creation to planning, loading, driver operations, tracking, and receiving. Its role-based portals share operational data stored in PostgreSQL.

- **Store Manager** — creates orders, follows delivery progress, views delays, and manages receiving.
- **Dispatcher** — manages the order queue, plans trips, assigns vehicles and drivers, and monitors operations.
- **Loader** — views confirmed trips, records loading progress and shortfalls, and marks loads ready.
- **Driver** — views assigned trips and routes, records arrival, and reports unsuccessful deliveries.

## Architecture

```text
Browser
   |
   v
NGINX (React frontend and reverse proxy)
   |
   v
.NET API Gateway
   |
   +-- .NET Authentication Service
   +-- Java Order Service
   +-- Java Planning Service
   +-- Go Loading & Delivery Service
   +-- Go Notification Service
           |
           +-- Supabase PostgreSQL
           +-- RabbitMQ

External integration: Mapbox maps, road routes, and location
```

See [docs/architecture.md](docs/architecture.md) for the detailed system design.

## Tech stack

| Area | Technologies |
|---|---|
| Frontend | React 18, TypeScript/TSX, Vite, HTML, standard CSS, Mapbox GL JS |
| Gateway and authentication | C# / .NET 8, YARP, Entity Framework Core |
| Orders and planning | Java 21, Spring Boot, Flyway, gRPC |
| Loading, delivery, notifications | Go 1.22, REST, gRPC, WebSocket |
| Data and messaging | Supabase PostgreSQL, SQL/PL/pgSQL, RabbitMQ |
| Infrastructure | Docker, Docker Compose, NGINX, Protocol Buffers |

The repository does not use Tailwind CSS or Python.

## Microservices

| Service | Language | Responsibility |
|---|---|---|
| API Gateway | C# / .NET | Central API entry point and request routing |
| Auth Service | C# / .NET | Authentication and role-based authorization |
| Order Service | Java | Order creation and order lifecycle management |
| Planning Service | Java | Trip planning, allocation, and validation |
| Loading & Delivery Service | Go | Loading, driver, and delivery operations |
| Notification Service | Go | RabbitMQ event handling and operational notifications |

## Operational workflow

1. A Store Manager creates an order.
2. The Dispatcher sees the database-backed order in the Order Queue.
3. The Dispatcher builds a trip and assigns a suitable vehicle and driver.
4. Confirming the trip makes it available to both Loader and Driver workflows.
5. The Loader records item progress or a loading shortfall and marks the load ready.
6. The Driver views the assigned vehicle, delivery stops, notifications, and Mapbox road route.
7. **I've Arrived** records the stop as `ARRIVED` and updates Dispatcher and Store Manager tracking.
8. **Can't Deliver** records `NOT_DELIVERED`, creates a Dispatcher review item, and shows the reason to the Store Manager.

Arrival reporting does not require proof-file uploads.

## Fleet validation

The configured active fleet contains 10 database vehicles. Three vehicles are intentionally unavailable to demonstrate validation failures. Selectable vehicles continue to use these allocation rules:

- Maximum two trips per vehicle per delivery date
- Weight and volume capacity
- Temperature and refrigeration suitability
- Vehicle and order brand suitability
- Home-depot compatibility
- Restricted-outlet access
- Delivery windows, fuel quota, duplicate allocation, and availability

Inactive historical vehicle rows remain in PostgreSQL for referential integrity but are excluded from the selectable fleet.

## Project structure

```text
Farm2Route_Waypoint/
├── frontend/                         React and TypeScript application
├── services/
│   ├── api-gateway/                  C# / .NET gateway
│   ├── auth-service/                 C# / .NET authentication
│   ├── order-service/                Java order management
│   ├── planning-service/             Java planning and allocation
│   ├── loading-delivery-service/     Go loading and delivery
│   └── notification-service/         Go notifications
├── supabase/                         PostgreSQL schema, seeds, and migrations
├── proto/                            Protocol Buffer contracts
├── infra/                            Infrastructure configuration
├── nginx/                            Frontend and reverse-proxy image
├── docs/                             Architecture documentation
├── docker-compose.yml
└── DOCKER_SETUP.md
```

## Getting started

### Requirements

- Git
- Docker Desktop
- Docker Compose v2
- Access to the configured Supabase PostgreSQL database
- A Mapbox token for map functionality

### Clone and configure

```powershell
git clone https://github.com/pirathee587/Farm2Route_Waypoint.git
cd Farm2Route_Waypoint
Copy-Item .env.example .env
```

Configure the root `.env` and the service `.env` files referenced by `docker-compose.yml`. Use [DOCKER_SETUP.md](DOCKER_SETUP.md) for the required variables and service-specific setup. Never commit real `.env` files or secrets.

Important environment values include:

```dotenv
SUPABASE_DB_HOST=your_database_host
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=your_database_user
SUPABASE_DB_PASSWORD=your_database_password
RABBITMQ_USER=your_rabbitmq_user
RABBITMQ_PASSWORD=your_rabbitmq_password
JWT_SECRET=your_secure_jwt_secret
VITE_MAPBOX_TOKEN=your_public_mapbox_token
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### Build and start

```powershell
docker compose config
docker compose up -d --build
docker compose ps
```

Open the application in Chrome:

- <http://localhost>
- <https://localhost> when using the included local SSL configuration

The NGINX container serves the React application and proxies `/api` requests to the API Gateway. Some backend development ports are also published by Compose for diagnostics.

## Seeded development accounts

All seeded accounts use the local development password `Waypoint@2026`.

| Email | Role | Details |
|---|---|---|
| `manager@waypoint.lk` | Store Manager | `OUT001` |
| `dispatcher@waypoint.lk` | Dispatcher | Delivery operations |
| `loader@waypoint.lk` | Loader | Loading operations |
| `driver@waypoint.lk` | Driver | Driver portal |
| `drv014@waypoint.lk` | Driver | `DRV014` |

These credentials are intended only for the seeded development environment. Replace or disable them before a public deployment.

## Application routes

### Store Manager

| Page | Route |
|---|---|
| Dashboard | `/store-manager` |
| Create order | `/store-manager/orders/new` |
| Order history | `/store-manager/orders` |
| Delivery tracking | `/store-manager/orders/{id}/tracking` |
| Receiving | `/store-manager/receiving` |

### Dispatcher

| Page | Route |
|---|---|
| Dashboard | `/dispatcher/dashboard` |
| Order Queue | `/dispatcher/orders` |
| Route Planning | `/dispatcher/planning` |
| Loading shortfall review | `/dispatcher/planning/trips/{id}/loading-shortfall` |
| Deferred Orders | `/dispatcher/deferred` |
| Live Tracking | `/dispatcher/tracking` |
| Fleet / Capacity | `/dispatcher/fleet` |
| Reports | `/dispatcher/reports` |

Driver and Loader portals are selected automatically after login according to the authenticated role.

## Database and persistence

The Compose stack uses an externally hosted Supabase PostgreSQL database; it does not create a local PostgreSQL container. The `supabase` directory contains the project schema, seed data, functions, triggers, and ordered migrations. Java services also contain service-owned Flyway migrations, while the Auth service uses Entity Framework Core.

Run the required database setup against the configured Supabase database before starting a fresh environment. Refer to [DOCKER_SETUP.md](DOCKER_SETUP.md) for the current initialization procedure.

`docker compose down` removes the Compose containers and network while preserving named volumes. `docker compose down --volumes` additionally removes local RabbitMQ state and loading uploads; it does not delete the external Supabase database.

## Verification

Recommended end-to-end checks:

| Test | Expected result |
|---|---|
| Store Manager creates an order | Order appears in the Dispatcher queue |
| Dispatcher confirms a trip | Trip reaches Loader and Driver workflows |
| Loader records progress | Database-backed loading percentage and status update |
| Loader reports a shortfall | Dispatcher shortfall review becomes available |
| Driver reports arrival | Tracking shows `ARRIVED` |
| Driver selects Can't Deliver | Dispatcher review and Store Manager issue status update |
| Unavailable vehicle is selected | Planning validation rejects the allocation |

## Useful Docker commands

```powershell
docker compose ps
docker compose logs --tail=200 planning-service
docker compose logs --tail=200 loading-delivery-service
docker compose up -d --build nginx
docker compose up -d --build nginx loading-delivery-service
docker compose stop
docker compose down
```

After rebuilding the frontend, use `Ctrl + Shift + R` in Chrome if an older cached UI is displayed.

## Git and repository

Run Git commands from the repository directory, not its parent:

```powershell
cd C:\Users\DELL\Desktop\Farm2Route\Farm2Route_Waypoint
git remote -v
git status
```

The expected origin is:

```text
https://github.com/pirathee587/Farm2Route_Waypoint.git
```

To commit the README and push the `main` branch:

```powershell
git add README.md
git commit -m "docs: update project README"
git branch -M main
git push -u origin main
```

## Documentation

- [System architecture](docs/architecture.md)
- [Docker setup and troubleshooting](DOCKER_SETUP.md)

<div align="center">

### Farm2Route Waypoint

**Connecting stores, dispatchers, loaders, and drivers through smarter delivery operations.**

</div>
