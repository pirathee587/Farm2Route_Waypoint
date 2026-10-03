# Waypoint Planning Service

Spring Boot 3 / Java 21 planning backend for the Dispatcher experience.

## Implemented
- Dispatcher dashboard planning summary
- Planning order read model
- Draft trip persistence
- Server-side trip validation
- Weight, volume, temperature, depot, brand, district, outlet access, delivery window, max-2-routes, duplicate allocation constraints
- Optional weekly fuel quota validation when planning state is configured
- Rule-based suggested-plan generator
- Trip confirmation with mandatory revalidation
- Allocation persistence
- Capacity-shortfall summary
- Defer / return-to-planning workflow
- RabbitMQ `ALLOCATION_COMPLETED` and `ORDER_DEFERRED` events
- Actuator health endpoint

## Important integration note
The repository's Order Service is currently a skeleton and its gRPC server is not implemented. To keep this Planning Service runnable now, reference orders/outlets/vehicles are read from the same Supabase PostgreSQL schema through a read-only repository. The service never creates or owns those master records. When Order Service gRPC is implemented, replace `ReferenceRepository` with a gRPC adapter; planning domain logic does not need to change.

## Database
First apply the repository migrations under `/supabase/migrations`, especially `20260927000002_order_schema.sql` and `20260927000003_planning_schema.sql`. Then apply `src/main/resources/db/migration/V1__planning_service_extensions.sql` for draft and operational vehicle-planning state.

Fuel quota is evaluated only when `vehicle_planning_state.weekly_fuel_quota_l > 0`; otherwise validation returns `NOT_EVALUATED` instead of inventing missing source data. `RESTRICTED` parking is treated as the current schema's van-only proxy.

## Main endpoints
- `GET /api/planning/dashboard?date=YYYY-MM-DD`
- `GET /api/planning/orders?date=YYYY-MM-DD`
- `GET /api/planning/orders/{id}`
- `PUT /api/planning/drafts/{id}`
- `POST /api/planning/trips/validate`
- `POST /api/planning/trips/confirm`
- `POST /api/planning/suggestions?date=YYYY-MM-DD`
- `GET /api/planning/shortfalls?date=YYYY-MM-DD`
- `GET /api/planning/deferred?date=YYYY-MM-DD`
- `POST /api/planning/orders/{id}/defer`
- `POST /api/planning/orders/{id}/return-to-planning`

## Run
Copy `.env.example` to `.env`, fill Supabase/RabbitMQ values, then run `mvn spring-boot:run`.
