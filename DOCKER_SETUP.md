# Farm2Route Docker setup

## Architecture

The stack contains a Vite/React frontend served by Nginx, a .NET 8 YARP API gateway, a .NET 8 authentication service, Java 21 Spring Boot order and planning services, Go loading/delivery and notification services, PostgreSQL 16, and RabbitMQ. All internal traffic uses the private `farm2route` Compose network. Only the frontend and RabbitMQ management UI are published to the host.

The frontend sends same-origin `/api` requests to its Nginx server, which proxies them to `api-gateway:8080`. The gateway routes requests to backend service names. PostgreSQL data, RabbitMQ state, and uploaded delivery files use named volumes. The `ml-datathon` directory contains research placeholders only; there is no runnable model service or runtime model artifact in the repository.

## Prerequisites and configuration

Install Docker Desktop with Docker Compose v2. From the repository root, create your private configuration:

```powershell
Copy-Item .env.example .env
```

At minimum, replace `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, and `JWT_SECRET`. Mapbox and Supabase values are optional for the self-contained local stack. `VITE_MAPBOX_TOKEN` is embedded during the frontend build, so rebuild after changing it. Do not commit `.env`.

Database initialization runs `supabase/test_bootstrap.sql` followed by the forward SQL migrations in lexical order. It runs only when the `postgres_data` volume is first created. Application-owned Flyway/EF initialization then applies service-specific schema additions without deleting existing data.

## Build and run

```powershell
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100
```

Open the application at <http://localhost:3000>. RabbitMQ management is at <http://localhost:15672> using the credentials in `.env`. Backend containers are intentionally not exposed; test the gateway through <http://localhost:3000/api/>. Change `FRONTEND_PORT` or `RABBITMQ_MANAGEMENT_PORT` if either host port is occupied.

Useful lifecycle commands:

```powershell
docker compose logs -f api-gateway
docker compose restart planning-service
docker compose up -d --build frontend
docker compose stop
docker compose down
```

`docker compose down` preserves named volumes. Do not add `--volumes` unless you deliberately want to erase the local database, RabbitMQ state, and uploads.

## Rebuilds and troubleshooting

- After source or frontend build-variable changes: `docker compose up -d --build`.
- If a service is unhealthy: `docker compose ps`, then `docker compose logs --tail=200 <service>`.
- If database initialization fails, inspect `docker compose logs postgres`. Fix the SQL/configuration before considering a fresh volume; removing the volume destroys local data.
- If login tokens fail at the gateway, ensure every service has the same `JWT_SECRET`, issuer, and audience, then rebuild/recreate the affected containers.
- If maps are unavailable, set both Mapbox variables in `.env` and rebuild the frontend.
- On constrained machines, Docker Desktop should have enough memory for two JVMs, two .NET services, two Go services, PostgreSQL, RabbitMQ, and the frontend. Start with at least 6 GB assigned to Docker.

## Docker Hub

Set `DOCKERHUB_USERNAME` and `IMAGE_TAG`, authenticate manually, then build and push only when desired:

```powershell
docker login
docker compose build
docker compose push
```

Recommended repositories are `farm2route-frontend`, `farm2route-gateway`, `farm2route-auth`, `farm2route-order`, `farm2route-planning`, `farm2route-loading-delivery`, and `farm2route-notification`, tagged with a release such as `v1.0.0` rather than relying only on `latest`. PostgreSQL and RabbitMQ continue to use their official upstream images. Credentials are runtime environment values and are never copied into application images.
