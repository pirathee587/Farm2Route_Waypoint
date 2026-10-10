
# 🚚 Farm2Route Waypoint — Delivery Operations Platform

<div align="center">

![Farm2Route](https://img.shields.io/badge/Farm2Route-Waypoint-2563EB?style=for-the-badge)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![C#](https://img.shields.io/badge/C%23-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![NGINX](https://img.shields.io/badge/NGINX-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

**A database-backed, microservices-based delivery operations platform connecting Store Managers, Dispatchers, Loaders, and Drivers in one unified logistics workflow.**

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Programming Languages](#-programming-languages)
- [Microservices](#-microservices)
- [Operational Workflow](#-operational-workflow)
- [Fleet Management and Validation](#-fleet-management-and-validation)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Seeded Accounts](#-seeded-accounts)
- [Application Routes](#-application-routes)
- [Database Initialization](#-database-initialization)
- [Testing and Verification](#-testing-and-verification)
- [Troubleshooting](#-troubleshooting)
- [Git and Repository](#-git-and-repository)

---

## 🌍 Project Overview

**Farm2Route Waypoint** is a full-stack delivery operations platform designed to manage the end-to-end delivery lifecycle.

The platform integrates four operational roles through a shared database and coordinated microservices.

It supports:

- 🏪 **Store Managers** — Create orders, monitor delivery progress, and manage receiving.
- 📋 **Dispatchers** — Manage orders, plan delivery trips, allocate vehicles, and monitor operations.
- 📦 **Loaders** — Track loading progress, record shortages, and prepare trips for dispatch.
- 🚚 **Drivers** — View assigned trips, navigate delivery routes, report arrivals, and record delivery issues.

### 🎯 Project Objectives

- Centralize delivery operations.
- Improve coordination between operational roles.
- Support vehicle and driver allocation.
- Enforce fleet and delivery constraints.
- Provide real-time operational visibility.
- Maintain persistent delivery records.
- Support exception handling and delivery issue reporting.

---

## 🏗️ Architecture

Farm2Route Waypoint follows a **microservices architecture** using multiple programming languages and service-specific responsibilities.

```text
+--------------------------------------------------+
|                  React Frontend                  |
|                TypeScript / TSX                  |
|                 localhost:3000                   |
+-----------------------+--------------------------+
                        |
                        | /api
                        v
+--------------------------------------------------+
|                .NET API Gateway                  |
|                    C# / .NET                     |
+-----------------------+--------------------------+
                        |
          +-------------+-------------+
          |                           |
          v                           v
+---------------------+   +------------------------+
| Authentication      |   | Business Microservices |
| Service             |   |                        |
| C# / .NET           |   | Java Order Service     |
|                     |   | Java Planning Service  |
+---------------------+   | Go Loading / Delivery  |
                          | Go Notification Service|
                          +------------+-----------+
                                       |
                   +-------------------+----------------+
                   |                                    |
                   v                                    v
          +-------------------+              +----------------+
          | PostgreSQL        |              | RabbitMQ       |
          | Operational Data  |              | Messaging      |
          +-------------------+              +----------------+

External Integration:
    Mapbox — Maps, Road Routes and Location
```

### Architecture Highlights

- React-based frontend application.
- Centralized .NET API Gateway.
- Authentication and role-based access.
- Java services for order management and planning.
- Go services for loading, delivery, and notifications.
- PostgreSQL for persistent operational data.
- RabbitMQ for asynchronous messaging.
- Protocol Buffers for service communication contracts.
- Docker Compose for local container orchestration.

For the detailed system architecture, see [Architecture Documentation](docs/architecture.md).

---

## ✨ Key Features

### 🏪 Store Manager Portal

- Create delivery orders.
- View order history and details.
- Monitor delivery status.
- Track orders through the delivery lifecycle.
- View delivery delays and reported reasons.
- Manage receiving operations.

### 📋 Dispatcher Portal

- View orders submitted by Store Managers.
- Manage the Order Queue.
- Create and review delivery trips.
- Assign suitable vehicles and drivers.
- Validate fleet allocation constraints.
- Confirm delivery plans.
- Monitor loading operations.
- Track delivery progress.
- Review failed or deferred deliveries.

### 📦 Loader Portal

- View confirmed trips.
- Access assigned loading tasks.
- Record item-level loading progress.
- Report loading shortfalls.
- Mark loads ready for dispatch.
- Coordinate loading status with other roles.

### 🚚 Driver Portal

- View assigned trips.
- Access assigned vehicle information.
- View delivery stops.
- Receive operational notifications.
- View Mapbox road routes.
- Share browser GPS location when permitted.
- Record arrival using **I've Arrived**.
- Report unsuccessful delivery attempts using **Can't Deliver**.

### 📍 Tracking and Exception Handling

- Dispatcher Live Tracking.
- Store Manager delivery tracking.
- Driver arrival reporting.
- Delivery issue reporting.
- Dispatcher review of deferred deliveries.
- Persistent operational status updates.

---

## 🛠️ Tech Stack

### ⚛️ Frontend

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)

| Technology | Purpose |
|---|---|
| React | Frontend UI framework |
| TypeScript / TSX | Typed application development |
| HTML | Application entry document |
| Mapbox | Maps and route visualization |
| NGINX | Frontend request routing and proxy configuration |

### ⚙️ Backend

![.NET](https://img.shields.io/badge/.NET-512BD4?style=flat-square&logo=dotnet&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat-square&logo=go&logoColor=white)

| Technology | Purpose |
|---|---|
| C# / .NET | API Gateway and Authentication |
| Java | Order and Planning services |
| Go | Loading, Delivery and Notifications |
| REST APIs | Frontend-to-backend communication |
| Protocol Buffers | Service communication contracts |

### 🗄️ Database and Messaging

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)

| Technology | Purpose |
|---|---|
| PostgreSQL | Primary operational database |
| SQL / PL/pgSQL | Schemas, functions, triggers and migrations |
| RabbitMQ | Asynchronous messaging |
| Flyway / EF Migrations | Service-owned database migrations |

### 🐳 DevOps and Infrastructure

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![NGINX](https://img.shields.io/badge/NGINX-009639?style=flat-square&logo=nginx&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| NGINX | Reverse proxy and frontend serving |
| Git | Version control |
| GitHub | Source code repository |
| Shell Scripts | Database startup automation |

---

## 💻 Programming Languages

The following languages are used in the repository.

| Language | Location | Purpose |
|---|---|---|
| TypeScript / TSX | `frontend/src` | React pages, components and API clients |
| HTML | `frontend/index.html` | Frontend entry document |
| C# | `services/auth-service` | Authentication |
| C# | `services/api-gateway` | API Gateway |
| Java | `services/order-service` | Order management |
| Java | `services/planning-service` | Planning and allocation |
| Go | `services/loading-delivery-service` | Loading and delivery |
| Go | `services/notification-service` | Notifications |
| SQL / PL/pgSQL | `supabase` and service migrations | Database operations |
| Protocol Buffers | `proto` | Service contracts |
| POSIX Shell | `infra/postgres` | Migration initialization |

Additional configuration formats include YAML, JSON, XML, Dockerfiles, Docker Compose, `.env`, and NGINX configuration.

---

## 🔧 Microservices

| Service | Language | Responsibility |
|---|---|---|
| API Gateway | C# / .NET | Central API entry point |
| Auth Service | C# / .NET | Authentication and authorization |
| Order Service | Java | Order creation and management |
| Planning Service | Java | Trip planning and allocation validation |
| Loading & Delivery Service | Go | Loading and delivery operations |
| Notification Service | Go | Operational notifications |

These services work together to support the delivery lifecycle.

---

## 🔄 Operational Workflow

```text
Store Manager
      |
      | Creates Order
      v
Order Service
      |
      | Saves Order to PostgreSQL
      v
Dispatcher Order Queue
      |
      | Plans Trip
      | Assigns Vehicle and Driver
      | Validates Constraints
      v
Trip Confirmation
      |
      +------------------------+
      |                        |
      v                        v
Loader Portal              Driver Portal
      |                        |
      | Records Loading        | Views Assigned Trip
      | Reports Shortfall      | Uses Mapbox Route
      | Marks Load Ready       |
      |                        v
      |                  Delivery Operations
      |                        |
      |                 +------+------+
      |                 |             |
      |                 v             v
      |             Arrived       Can't Deliver
      |                 |             |
      |                 v             v
      |           ARRIVED       NOT_DELIVERED
      |                              |
      |                              v
      |                       Dispatcher Review
      |                              |
      +------------------------------+
                                     |
                                     v
                           PostgreSQL Updates
                                     |
                      +--------------+-------------+
                      |                            |
                      v                            v
              Dispatcher Tracking          Store Manager
                                           Order Tracking
```

### Step 1 — Order Creation

Store Manager creates an order.

The Order Service stores the order in PostgreSQL.

The Dispatcher can view the same order in the Order Queue.

### Step 2 — Trip Planning

Dispatcher:

1. Selects orders.
2. Builds a delivery trip.
3. Selects a suitable vehicle.
4. Assigns a driver.
5. Reviews allocation constraints.
6. Confirms the trip.

### Step 3 — Loading

The confirmed trip becomes available to the Loader.

The Loader can:

- Record item loading progress.
- Report loading shortages.
- Mark the load ready.

### Step 4 — Driver Assignment

The Driver receives the assigned trip and can view:

- Assigned vehicle.
- Delivery stops.
- Operational notifications.
- Mapbox road route.
- Live location when GPS permission is available.

### Step 5 — Arrival

When the Driver selects **I've Arrived**:

- Arrival is recorded.
- Dispatcher Live Tracking shows `ARRIVED`.
- Store Manager tracking changes to `out_for_delivery`.

Arrival reporting does not require proof-file uploads.

### Step 6 — Failed Delivery Attempt

When the Driver selects **Can't Deliver**:

- A delivery deferral is recorded.
- A Dispatcher review item is created.
- Live Tracking shows `NOT_DELIVERED` / issue.
- Store Manager tracking changes to `delivery_attempted`.
- The reported reason becomes visible.

---

## 🚛 Fleet Management and Validation

The local active fleet contains **10 database vehicles**.

- 3 vehicles are intentionally marked operationally unavailable.
- Remaining vehicles follow normal allocation rules.
- Inactive historical vehicles remain stored for referential integrity.
- Inactive vehicles are excluded from the selectable fleet.

### Allocation Rules

| Validation | Description |
|---|---|
| Trip limit | Maximum 2 trips per vehicle per delivery date |
| Weight capacity | Total assigned weight must fit vehicle capacity |
| Volume capacity | Total assigned volume must fit vehicle capacity |
| Refrigeration | Temperature-sensitive orders require suitable vehicles |
| Brand suitability | Vehicle must be suitable for assigned order brands |
| Home depot | Depot compatibility must be respected |
| Restricted outlets | Van-access restrictions must be respected |
| Delivery windows | Planned deliveries must satisfy time constraints |
| Fuel quota | Fuel constraints must be validated |
| Duplicate allocation | Conflicting allocations must be prevented |
| Availability | Unavailable vehicles cannot be assigned |

These rules help prevent invalid delivery plans.

---

## 📁 Project Structure

```text
Farm2Route_Waypoint/
|
+-- frontend/
|   +-- src/
|   |   +-- React pages
|   |   +-- Components
|   |   +-- API clients
|   |   +-- Application logic
|   +-- index.html
|
+-- services/
|   +-- auth-service/
|   |   +-- C# / .NET authentication
|   |
|   +-- api-gateway/
|   |   +-- C# / .NET API Gateway
|   |
|   +-- order-service/
|   |   +-- Java order management
|   |
|   +-- planning-service/
|   |   +-- Java trip planning
|   |
|   +-- loading-delivery-service/
|   |   +-- Go loading and delivery
|   |
|   +-- notification-service/
|       +-- Go notifications
|
+-- supabase/
|   +-- test_bootstrap.sql
|   +-- migrations/
|
+-- proto/
|   +-- Service communication contracts
|
+-- infra/
|   +-- postgres/
|       +-- 01-apply-migrations.sh
|
+-- docs/
|   +-- architecture.md
|
+-- .env.example
+-- DOCKER_SETUP.md
+-- README.md
+-- Docker Compose configuration
```

This structure shows the main repository directories and their responsibilities.

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Purpose |
|---|---|
| Git | Clone repository |
| Docker Desktop | Container runtime |
| Docker Compose v2 | Multi-service orchestration |
| Chrome | Access frontend application |
| Mapbox Token | Enable map functionality |

### 1️⃣ Clone the Repository

```powershell
git clone https://github.com/pirathee587/Farm2Route_Waypoint.git

cd Farm2Route_Waypoint
```

### 2️⃣ Configure Environment Variables

Create a local `.env` file:

```powershell
Copy-Item .env.example .env
```

Update the required environment variables before starting the services.

**Important:** Never commit `.env` files or real secrets to GitHub.

### 3️⃣ Validate Docker Compose

```powershell
docker compose config
```

This validates the Compose configuration.

### 4️⃣ Build and Start Services

```powershell
docker compose up -d --build
```

Docker Compose builds and starts the configured containers.

### 5️⃣ Check Container Status

```powershell
docker compose ps
```

### 6️⃣ Open the Application

Open Chrome and visit:

**http://localhost:3000**

Frontend requests use same-origin `/api` routes through the API Gateway.

Backend containers are intentionally not exposed directly to the host.

For detailed instructions, see [Docker Setup Guide](DOCKER_SETUP.md).

---

## 🔐 Environment Variables

Create `.env` from `.env.example`.

At minimum, replace the local:

- PostgreSQL password
- RabbitMQ password
- JWT secret

### Mapbox Configuration

```dotenv
VITE_MAPBOX_TOKEN=your_public_mapbox_token
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

After configuring Mapbox, rebuild the affected services:

```powershell
docker compose up -d --build frontend loading-delivery-service
```

**Security Notes**

- Do not commit `.env`.
- Do not expose database credentials.
- Do not expose RabbitMQ credentials.
- Keep JWT secrets private.
- Use only public-scoped tokens in browser-side configuration.

---

## 👥 Seeded Accounts

The local development environment includes seeded accounts for testing role-specific workflows.

| Email | Role | Details |
|---|---|---|
| `manager@waypoint.lk` | Store Manager | OUT001 |
| `dispatcher@waypoint.lk` | Dispatcher | Delivery operations |
| `loader@waypoint.lk` | Loader | Loading operations |
| `driver@waypoint.lk` | Driver | Driver portal |
| `drv014@waypoint.lk` | Driver | DRV014 |

**Local development password:** `Waypoint@2026`

> These credentials are intended only for the seeded local development environment. Replace or disable them before any public deployment.

---

## 🧭 Application Routes

### Store Manager

| Page | Route |
|---|---|
| Dashboard | `/store-manager` |
| Create Order | `/store-manager/orders/new` |
| Order History | `/store-manager/orders` |
| Delivery Tracking | `/store-manager/orders/{id}/tracking` |
| Receiving | `/store-manager/receiving` |

### Dispatcher

| Page | Route |
|---|---|
| Dashboard | `/dispatcher` |
| Order Queue | `/dispatcher/orders` |
| Route Planning | `/dispatcher/planning` |
| Loading Visibility | `/dispatcher/loading` |
| Live Tracking | `/dispatcher/tracking` |

### Driver and Loader

Driver and Loader portals are selected automatically after login based on the authenticated user role.

---

## 🗄️ Database Initialization

The application uses PostgreSQL to persist operational data.

### Fresh Database Setup

On a fresh PostgreSQL Docker volume, Compose applies:

1. `supabase/test_bootstrap.sql`
2. Ordered SQL files in `supabase/migrations`
3. Service-owned Flyway / EF migrations

### Persistent Data

Operational records include:

- Orders
- Trips and allocations
- Vehicle information
- Loading progress
- Driver operations
- Delivery status
- Delivery issues
- Notifications

These operational workflows use database-backed records rather than frontend demo data.

### Important Docker Volume Behavior

```powershell
docker compose down
```

Stops and removes Compose containers while preserving named volumes.

Avoid using:

```powershell
docker compose down --volumes
```

unless you deliberately want to delete local database data, RabbitMQ state, and uploaded files.

---

## 🧪 Testing and Verification

### Verify Running Containers

```powershell
docker compose ps
```

### View Loading and Delivery Logs

```powershell
docker compose logs --tail=200 loading-delivery-service
```

### View Planning Logs

```powershell
docker compose logs --tail=200 planning-service
```

### Recommended Manual Workflow Verification

| Test | Expected Behavior |
|---|---|
| Store Manager creates order | Order appears in Dispatcher queue |
| Dispatcher confirms trip | Trip reaches Loader and Driver |
| Loader records progress | Loading progress is stored |
| Loader reports shortfall | Shortfall is recorded |
| Driver reports arrival | Tracking shows `ARRIVED` |
| Driver cannot deliver | Review item and issue status appear |
| Unavailable vehicle selected | Allocation validation prevents invalid assignment |
| Store Manager checks tracking | Updated delivery state is visible |

---

## 🐳 Docker Commands

### Start All Services

```powershell
docker compose up -d --build
```

### Check Status

```powershell
docker compose ps
```

### Rebuild Frontend

```powershell
docker compose up -d --build frontend
```

### Rebuild Mapbox-Related Services

```powershell
docker compose up -d --build frontend loading-delivery-service
```

### View Service Logs

```powershell
docker compose logs --tail=200 planning-service
docker compose logs --tail=200 loading-delivery-service
```

### Stop Containers

```powershell
docker compose stop
```

### Remove Containers Without Deleting Volumes

```powershell
docker compose down
```

---

## 🛠️ Troubleshooting

### Frontend Does Not Load

Check container status:

```powershell
docker compose ps
```

Rebuild the frontend if necessary:

```powershell
docker compose up -d --build frontend
```

### Browser Displays Old UI

Perform a hard refresh in Chrome:

```text
Ctrl + Shift + R
```

### Planning Service Issues

Inspect service logs:

```powershell
docker compose logs --tail=200 planning-service
```

### Loading or Delivery Issues

Inspect service logs:

```powershell
docker compose logs --tail=200 loading-delivery-service
```

### Maps Are Not Working

Verify the Mapbox environment variables:

```dotenv
VITE_MAPBOX_TOKEN=your_public_mapbox_token
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

Rebuild the relevant services after updating the tokens.

For additional troubleshooting instructions, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

---

## 🔗 Git and Repository

### Repository

[Farm2Route Waypoint — GitHub](https://github.com/pirathee587/Farm2Route_Waypoint)

### Navigate to the Repository

```powershell
cd C:\Users\DELL\Desktop\Farm2Route\Farm2Route_Waypoint
```

### Check Remote Repository

```powershell
git remote -v
```

Expected origin:

```text
https://github.com/pirathee587/Farm2Route_Waypoint.git
```

### Check Git Status

```powershell
git status
```

### Commit README Changes

```powershell
git add README.md
git commit -m "docs: improve README with technology badges"
git push origin HEAD
```

---

## 📚 Documentation

- [System Architecture](docs/architecture.md)
- [Docker Setup and Troubleshooting](DOCKER_SETUP.md)

---

<div align="center">

### 🚚 Farm2Route Waypoint

**Connecting Stores, Dispatchers, Loaders, and Drivers through smarter delivery operations.**

Built with React, .NET, Java, Go, PostgreSQL, RabbitMQ, Docker and Mapbox.

</div>
