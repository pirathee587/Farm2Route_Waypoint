# Waypoint

Waypoint is a delivery planning system with a Store Manager portal, service-to-service gRPC contracts, RabbitMQ events, and Supabase PostgreSQL persistence. See [docs/architecture.md](docs/architecture.md) for the full system map.

## Local Stack

The intended local entry point is NGINX at `https://localhost`; browser API calls go through NGINX and the API Gateway, never directly to Order Service.

Before starting a fresh stack:

```bash
cp .env.example .env
cp services/auth-service/.env.example services/auth-service/.env
cp services/api-gateway/.env.example services/api-gateway/.env
cp services/order-service/.env.example services/order-service/.env
cp services/planning-service/.env.example services/planning-service/.env
cp services/loading-delivery-service/.env.example services/loading-delivery-service/.env
cp services/notification-service/.env.example services/notification-service/.env

# Generate local HTTPS certificates as described in nginx/README.md.
docker compose up --build
```

The Auth Service seed account is:

| Email | Password | Role | Outlet |
|---|---|---|---|
| `manager@waypoint.lk` | `Waypoint@2026` | `STORE_MANAGER` | `OUT001` |

Order reference data is loaded from `outlets.csv`, `vehicles.csv`, and `calendar.csv` using [services/order-service/src/main/resources/data/seed.sql](services/order-service/src/main/resources/data/seed.sql). The repository currently does not include the Challenge Booklet CSV files, and Compose does not execute that SQL automatically; provide those files and run the seed script against Supabase before judging data-dependent screens.

## Judge Walkthrough: Store Manager Portal

1. **Sign in.** Open `https://localhost`, sign in as `manager@waypoint.lk`, and enter the Store Manager portal at `/store-manager`. The gateway validates the JWT and the frontend route guard requires the `STORE_MANAGER` role.

2. **Place an order.** Open `/store-manager/orders/new`. Choose a brand, choose `Dry` or `Chilled` when the brand is `fresh`, select a requested delivery date, add items, and submit. The portal calls `POST /api/orders` through NGINX and the gateway. A successful order starts with status `PENDING`, then navigates to `/store-manager/orders/{id}/confirmed`.

3. **View the order on the dashboard and history.** Return to `/store-manager`. The dashboard calls `GET /api/orders` and computes the `PENDING`, `ALLOCATED`, `DEFERRED`, and `DELIVERED` cards client-side. Open `/store-manager/orders` to select the order and inspect its Timeline, Items, and Notes tabs.

4. **Review a deferral notice.** When Planning publishes the `order.deferred` event, the order becomes `DEFERRED`. The dashboard alert opens `/store-manager/orders/{id}/deferral`, which calls `GET /api/orders/{id}/deferral`, shows the reason/original/revised dates, and highlights repeat deferrals. Acknowledge the notice to return to `/store-manager`.

5. **Track delivery.** Open `/store-manager/orders/{id}/tracking`. The page calls `GET /api/orders/{id}/tracking` and displays the internal delivery states `allocated`, `loaded`, `out_for_delivery`, and `completed`. The order status remains one of the canonical values from `proto/order.proto`: `PENDING`, `ALLOCATED`, `DEFERRED`, `ATTEMPTED`, or `DELIVERED`; there is no `ARRIVED` status. A delayed tracking row displays the delayed warning variant.

6. **Complete delivery for the demo.** Loading/Delivery Service is not shipped yet, so delivery completion must be demo-simulated by the approved test fixture/event that publishes `delivery.completed`. That event moves the order to `DELIVERED`. The tracking page then enables **Proceed to Receiving** at `/store-manager/receiving`. No fake `ARRIVED` status is introduced.

7. **Confirm receipt.** On `/store-manager/receiving`, select a `DELIVERED` order, check the received items, enter the recipient, and submit. The portal calls `POST /api/orders/{id}/receipt`. Receipt confirmation is stored separately; the order remains `DELIVERED` because `proto/order.proto` has no `RECEIVED` status.

8. **Report an issue.** From `/store-manager/orders`, open the order detail, select the Notes tab, and choose **Report an issue**. Submit `missing`, `damaged`, `wrong_item`, or `late`, with a description and optional photo URL. The portal calls `POST /api/orders/{id}/issues`, refreshes `GET /api/orders/{id}/issues`, and shows a success toast. Issue reports are REST-only until the team confirms an `issue.reported` event contract.

### Route Summary

| Workflow | Route |
|---|---|
| Dashboard | `/store-manager` |
| New order | `/store-manager/orders/new` |
| Order confirmed | `/store-manager/orders/{id}/confirmed` |
| Order history/detail | `/store-manager/orders` |
| Delivery tracking | `/store-manager/orders/{id}/tracking` |
| Deferral notice | `/store-manager/orders/{id}/deferral` |
| Receiving/receipt | `/store-manager/receiving` |
