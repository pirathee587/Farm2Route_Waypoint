# Waypoint Loading & Delivery Service — API Specification

Service: `loading-delivery-service`  
Runtime: Go 1.22  
Default Port: `8080` (HTTP)  
Base Path: `/api/loading` (Loader endpoints), `/api/delivery` (Driver endpoints)

---

## Gateway Authentication & Role Guard

All incoming requests from clients pass through the API Gateway. The Gateway verifies client JWTs and sets anti-spoofing trust headers before forwarding requests to backend microservices.

### Required Inbound Headers

| Header | Description | Required | Example |
|---|---|---|---|
| `X-Gateway-Verified` | Set by gateway to `"true"` on verified tokens. Requests missing or with `"false"` are rejected (`401 Unauthorized`). | **Yes** | `true` |
| `X-User-Id` | Authenticated user UUID. | **Yes** | `11111111-1111-1111-1111-111111111101` |
| `X-User-Role` | User role (`LOADER`, `DISPATCHER`, `DRIVER`, `ADMIN`). | **Yes** | `LOADER` |
| `X-User-Email` | Authenticated user email address. | Optional | `kumar.loader@waypoint.lk` |

### Role Permissions for `/api/loading/**`

- `LOADER` / `ADMIN`: Full read/write access.
- `DISPATCHER`: Read-only access (`GET`, `HEAD`, `OPTIONS`). Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) return `403 Forbidden`.
- `DRIVER` / other roles: Rejected with `403 Forbidden`.

---

## 1. Today's Loads Overview

### `GET /api/loading/trips`

Returns warehouse trips for the current shift with summary metrics, shift metadata, and derived loading statuses.

#### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `date` | string (YYYY-MM-DD) | Filter by delivery date. Defaults to current date if omitted (`2026-10-03`). |
| `dock` | string (repeated or comma-separated) | Filter by assigned dock(s). E.g. `dock=Dock A5,Dock B2` or `dock=Dock A5&dock=Dock B2`. |
| `status` | string (repeated or comma-separated) | Filter by derived status (`Issue`, `Loading`, `Not Started`, `Ready`). |
| `q` | string | Substring search matching vehicle registration (`TRC-204`), driver name (`Nimal`), or destination area (`Union Place`). |
| `limit` | int | Page size limit (default: 20). |
| `offset` | int | Page start offset (default: 0). |

#### Status & Progress Derivation Rules

- **`loadedKg`**: Computed dynamically from the sum of `weight_kg` for all `load_items` with status `CHECKED`.
- **`capacityKg`**: Vehicle capacity (`vehicles.weight_cap_kg`).
- **`progressPct`**: Calculated as `round((100 * CHECKED items) / total items)`. Items in `ISSUE` state count as resolved (not pending) for Ready derivation only; for the percentage, `CHECKED / total` is used.
- **`status`**:
  1. `Issue` — Overrides all other states if there is any unresolved `issue_flag` on the trip.
  2. `Ready` — Trip confirmation status is `LOADED` / `READY` (`ready_at` is set). A trip is `"Ready"` only when `loading_confirmations` is `LOADED`/`READY`, not merely when progress is 100%.
  3. `Loading` — Trip confirmation status is `LOADING` or `progressPct > 0`.
  4. `Not Started` — Default when confirmation status is `PENDING` and `progressPct == 0`.
- **Summary Independence**: The `summary` metrics (`tripsToday`, `loaded`, `inProgress`, `pending`, `issuesNeedReview`) always cover all of today's trips regardless of active query filters.
- **Sort Priority**: `Issue` (1) → `Loading` (2) → `Not Started` (3) → `Ready` (4), then by vehicle ID.

#### Verified Live Request

```bash
curl -X GET "http://localhost:8080/api/loading/trips?date=2026-10-03" \
  -H "X-Gateway-Verified: true" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111101" \
  -H "X-User-Role: LOADER" \
  -H "X-User-Email: kumar.loader@waypoint.lk"
```

#### Real Response (Live Integration Database)

```json
{
  "meta": {
    "shift": "Shift A",
    "shiftStart": "06:00",
    "shiftEnd": "14:00",
    "depot": "Peliyagoda Distribution Center",
    "date": "2026-10-03"
  },
  "summary": {
    "tripsToday": 6,
    "addedThisShift": 2,
    "loaded": 2,
    "inProgress": 2,
    "pending": 1,
    "issuesNeedReview": 1
  },
  "trips": [
    {
      "tripId": "17600000-0000-0000-0000-000000000176",
      "vehicleId": "TRC-176",
      "status": "Issue",
      "progressPct": 42,
      "loadedKg": 1890,
      "capacityKg": 4500,
      "origin": "Peliyagoda DC",
      "destination": "Nugegoda",
      "stopCount": 4,
      "dock": "Dock A2",
      "driverName": "A. Wickramasinghe"
    },
    {
      "tripId": "20400000-0000-0000-0000-000000000204",
      "vehicleId": "TRC-204",
      "status": "Loading",
      "progressPct": 97,
      "loadedKg": 2896,
      "capacityKg": 5000,
      "origin": "Peliyagoda DC",
      "destination": "Union Place",
      "stopCount": 4,
      "dock": "Dock A5",
      "driverName": "Nimal Perera"
    },
    {
      "tripId": "22000000-0000-0000-0000-000000000220",
      "vehicleId": "TRC-220",
      "status": "Loading",
      "progressPct": 0,
      "loadedKg": 0,
      "capacityKg": 5500,
      "origin": "Peliyagoda DC",
      "destination": "Maharagama",
      "stopCount": 0,
      "dock": "Dock C3",
      "driverName": "Tharindu Silva"
    },
    {
      "tripId": "21100000-0000-0000-0000-000000000211",
      "vehicleId": "TRC-211",
      "status": "Not Started",
      "progressPct": 0,
      "loadedKg": 0,
      "capacityKg": 6000,
      "origin": "Peliyagoda DC",
      "destination": "Wattala",
      "stopCount": 0,
      "dock": "Dock C1",
      "driverName": "S. Fernando"
    },
    {
      "tripId": "18900000-0000-0000-0000-000000000189",
      "vehicleId": "TRC-189",
      "status": "Ready",
      "progressPct": 100,
      "loadedKg": 4760,
      "capacityKg": 4800,
      "origin": "Peliyagoda DC",
      "destination": "Negombo",
      "stopCount": 1,
      "dock": "Dock B2",
      "driverName": "Ruwan Jayasuriya"
    },
    {
      "tripId": "19800000-0000-0000-0000-000000000198",
      "vehicleId": "TRC-198",
      "status": "Ready",
      "progressPct": 100,
      "loadedKg": 3940,
      "capacityKg": 4000,
      "origin": "Peliyagoda DC",
      "destination": "Kiribathgoda",
      "stopCount": 1,
      "dock": "Dock B4",
      "driverName": "M. Rizwan"
    }
  ]
}
```

---

## 2. Dynamic Filter Options

### `GET /api/loading/trips/filter-options`

Returns unique docks and statuses present in today's active trips for populating frontend filter dropdowns.

#### Verified Live Request

```bash
curl -X GET "http://localhost:8080/api/loading/trips/filter-options?date=2026-10-03" \
  -H "X-Gateway-Verified: true" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111101" \
  -H "X-User-Role: LOADER"
```

#### Real Response (Live Integration Database)

```json
{
  "docks": [
    "Dock A2",
    "Dock A5",
    "Dock B2",
    "Dock B4",
    "Dock C1",
    "Dock C3"
  ],
  "statuses": [
    "Issue",
    "Loading",
    "Not Started",
    "Ready"
  ]
}
```

---

## 3. Trip Detail / Cargo Details (Task P3)

### `GET /api/loading/trips/{tripId}`

Retrieves complete trip manifest, cargo summary, refrigerated telemetry, and stops in **load sequence order** (`load_order` 1..N).

- **Route Parameter `tripId`**: Accepts either the trip UUID (`20400000-0000-0000-0000-000000000204`) or trip code (`WPT-204`, `TRC-204`).
- **Load Order (LIFO)**: Stops are returned in `load_order` ascending (Stop 4 is loaded first so it is deepest inside the truck for the last drop; Stop 1 is loaded last so it is at the door for the first drop).
- **Dynamic Derivation**: All counts (`itemsRemaining`, `lineItems`, `units`, `crates`, `weightKg`) are computed dynamically from `load_items` via view `v_load_stop_progress`, never statically stored.
- **Reefer Zone**: Populated only if the vehicle or trip carries chilled/frozen items; otherwise `null`.
- **Planning gRPC Sync & Fallback**: Calls `waypoint.planning.v1.PlanningService.GetTrip` with a 2-second timeout and 1 retry. If the planning service is unavailable, serves the local snapshot and includes `"stale": true`.

#### Verified Live Request

```bash
curl -X GET "http://localhost:8080/api/loading/trips/WPT-204" \
  -H "X-Gateway-Verified: true" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111101" \
  -H "X-User-Role: LOADER" \
  -H "X-User-Email: kumar.loader@waypoint.lk"
```

#### Real Response (Live Integration Database)

```json
{
  "header": {
    "tripCode": "WPT-204",
    "origin": "Peliyagoda DC",
    "destination": "Union Place",
    "status": "Loading"
  },
  "vehicle": {
    "vehicleId": "TRC-204",
    "capacityKg": 5000,
    "loadedKg": 2896,
    "loadPct": 58,
    "reeferZone": {
      "targetTempC": -18,
      "currentTempC": -17.5,
      "status": "Stable"
    }
  },
  "driver": {
    "name": "Nimal Perera"
  },
  "dock": "Dock A5",
  "plannedStart": "07:30",
  "shift": "Shift A",
  "totals": {
    "stops": 4,
    "lineItems": 30
  },
  "planBanner": null,
  "stops": [
    {
      "stopId": "20440000-0000-0000-0000-000000000004",
      "loadOrder": 1,
      "stopNo": 4,
      "dropLabel": "LAST DROP",
      "outlet": "Keells — Union Place",
      "area": "Colombo 02 · Colombo District",
      "dockNote": "Rear dock",
      "itemsRemaining": 1,
      "lineItems": 5,
      "units": 92,
      "crates": 42,
      "weightKg": 680,
      "tags": [
        "Rear dock"
      ],
      "status": "LOADING",
      "nextAction": "LOAD_NEXT",
      "changeFlag": null
    },
    {
      "stopId": "20430000-0000-0000-0000-000000000003",
      "loadOrder": 2,
      "stopNo": 3,
      "dropLabel": null,
      "outlet": "Singer — One Galle Face",
      "area": "Colombo 01 · Colombo District",
      "dockNote": "Shared mall bay",
      "itemsRemaining": 0,
      "lineItems": 9,
      "units": 146,
      "crates": 28,
      "weightKg": 1150,
      "tags": [
        "Shared mall bay"
      ],
      "status": "LOADED",
      "nextAction": "DONE",
      "changeFlag": null
    },
    {
      "stopId": "20420000-0000-0000-0000-000000000002",
      "loadOrder": 3,
      "stopNo": 2,
      "dropLabel": null,
      "outlet": "StyleHub — Kollupitiya",
      "area": "Colombo 03 · Colombo District",
      "dockNote": "Side dock",
      "itemsRemaining": 0,
      "lineItems": 8,
      "units": 110,
      "crates": 35,
      "weightKg": 820,
      "tags": [
        "Side dock"
      ],
      "status": "LOADED",
      "nextAction": "DONE",
      "changeFlag": null
    },
    {
      "stopId": "20410000-0000-0000-0000-000000000001",
      "loadOrder": 4,
      "stopNo": 1,
      "dropLabel": "FIRST DROP",
      "outlet": "FreshMart — Dematagoda",
      "area": "Colombo 09 · Colombo District",
      "dockNote": "Curb / street",
      "itemsRemaining": 0,
      "lineItems": 8,
      "units": 85,
      "crates": 20,
      "weightKg": 750,
      "tags": [
        "Curb / street"
      ],
      "status": "LOADED",
      "nextAction": "DONE",
      "changeFlag": null
    }
  ],
  "stale": true
}
```

---

## 4. Start Stop Loading (Task P3)

### `POST /api/loading/trips/{tripId}/stops/{stopId}/start`

Initiates the physical loading phase for a specific stop.

#### Business & Concurrency Rules

1. **Role Guard**: `LOADER` or `ADMIN` only. `DISPATCHER` receives `403 Forbidden`.
2. **Sequential Load Enforcement**: A stop cannot start while an earlier `load_order` stop is not `LOADED`. If attempted, returns `409 Conflict` with `{"code": "OUT_OF_SEQUENCE"}`.
3. **State Transitions**:
   - Updates target `load_stops.status` to `LOADING`.
   - If `loading_confirmations.status` was `PENDING`, updates it to `LOADING`.
   - Increments `loading_confirmations.version` for optimistic locking.
4. **Audit Logging**: Idempotently writes a single entry to `load_activity_log` with title `"Stop N loading opened"`.
5. **Idempotency**: Repeated calls on an already started stop return `200 OK` with the refreshed stop DTO and do not duplicate activity log rows.
6. **Plan Change Guard Hook**: Returns `409 Conflict` with `{"code": "PLAN_UNACKNOWLEDGED"}` if there are unacknowledged route changes pending acknowledgment (Task P4 guard).

#### Verified Out-of-Sequence Error (Attempting Stop 2 before Stop 3 on TRC-176)

```bash
curl -i -X POST "http://localhost:8080/api/loading/trips/TRC-176/stops/17620000-0000-0000-0000-000000000002/start" \
  -H "X-Gateway-Verified: true" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111101" \
  -H "X-User-Role: LOADER" \
  -H "X-User-Email: kumar.loader@waypoint.lk"
```

**Real Response:**
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":"Cannot start stop: previous stop in loading order is not fully loaded","code":"OUT_OF_SEQUENCE"}
```

#### Verified Successful Start (Starting Stop 3 on TRC-176)

```bash
curl -i -X POST "http://localhost:8080/api/loading/trips/TRC-176/stops/17630000-0000-0000-0000-000000000003/start" \
  -H "X-Gateway-Verified: true" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111101" \
  -H "X-User-Role: LOADER" \
  -H "X-User-Email: kumar.loader@waypoint.lk"
```

**Real Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{"stopId":"17630000-0000-0000-0000-000000000003","loadOrder":2,"stopNo":3,"dropLabel":null,"outlet":"Cargills — Kohuwala","area":"Colombo District","dockNote":"Rear bay","itemsRemaining":0,"lineItems":0,"units":70,"crates":22,"weightKg":520,"tags":["Rear bay"],"status":"LOADING","nextAction":"START_LOADING","changeFlag":null}
```

---

## 5. Demo Reset Endpoint (Development / Judging)

### `POST /api/loading/dev/reset-demo`

Restores Trip `WPT-204` to its exact pre-demo state in a single ACID transaction:
1. Clears any created issue flags on `WPT-204`.
2. Resets sequence `issue_flag_ref_seq` to 481 (ensuring the next created live shortfall receives `SR-0482`).
3. Resets `loading_confirmations` (`status: LOADING`, `ready_at: NULL`, `version: 0`).
4. Resets `load_items` (Keells Stop 4: 4 `CHECKED`, milk crates `PENDING`; Stops 1–3: all `CHECKED`).
5. Resets `load_activity_log` to initial entries ("Loading started" and "Stop 4 loading opened").
6. Cleans up any generated `plan_changes` for `WPT-204`.
7. Resets `load_stops` status (`Stop 4: LOADING`, `Stops 1-3: LOADED`).

> [!NOTE]  
> Enabled only when environment variable `DEMO_MODE=true` is set. When `false`, returns `404 Not Found`.

#### Verified Live Request

```bash
curl -i -X POST "http://localhost:8080/api/loading/dev/reset-demo" \
  -H "X-Gateway-Verified: true" \
  -H "X-User-Id: 11111111-1111-1111-1111-111111111101" \
  -H "X-User-Role: LOADER"
```

**Real Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{"message":"Demo state reset successfully for trip WPT-204"}
```

---

## 6. Loader Route Resequencing

### `PUT /api/loading/trips/{tripId}/route-order?version={version}`

LOADER-only, optimistic-version-checked endpoint. The body lists every active stop exactly once in the preferred warehouse loading sequence:

```json
{"stopIds":["stop-uuid-4","stop-uuid-3","stop-uuid-2","stop-uuid-1"]}
```

Only `load_order` changes; dispatcher-owned `stop_no` never changes. Unknown, duplicate, or missing stops return `400`. Moving a `LOADING` or `LOADED` stop returns `409 STOP_ALREADY_STARTED`; an unacknowledged dispatcher revision returns `409 PLAN_UNACKNOWLEDGED`; a stale `version` returns `409 VERSION_CONFLICT`.

Success returns the updated array using the trip-detail stop shape. The same transaction writes activity title `Loading sequence changed` and an outbox `ROUTE_RESEQUENCED` event routed as `loading.resequenced`:

```json
{"trip_id":"...","trip_code":"WPT-204","vehicle_id":"TRC-204","stop_order":["..."],"changed_by_id":"...","changed_at":"..."}
```

## 7. Depot Scope and Stale Semantics

For a LOADER, `GET /api/loading/trips` derives the depot from `user_profiles.depot`, with `LOADER_DEPOT_MAP=user-uuid=Kandy,...` as a configuration fallback. The response contains only that depot's trips. `meta.depot` and each trip's `origin` are derived from the trip vehicle's depot. DISPATCHER remains read-only and may view all depots.

Trip detail includes `"stale": true` only after an actual planning gRPC call failure. A successful gRPC response yields `false`; when no planning client is configured, the local snapshot is not falsely labelled stale.

Trip detail also returns top-level `version`, sourced from `loading_confirmations.version`. Clients must pass this value unchanged as the route-order `version` query parameter; an older value returns `409 VERSION_CONFLICT`.

Item tags remain item-specific. Stop tags are independently derived from the outlet brand plus applicable handling requirements (`chilled`, `reefer`, `fragile`, `ambient`, and outlet `van_only`); they are never the union of item tags. After demo reset, WPT-204 still exposes Keells `[Fresh, chilled, reefer]`, Singer `[Tech, fragile]`, StyleHub `[Style, ambient]`, and FreshMart `[Fresh, chilled, van_only]`.

All loading summary contracts use the same counting rule: `itemsLoaded`/`itemsChecked` counts only `CHECKED`, `exceptions` counts `ISSUE`, and `itemsTotal` counts every item.

---

## 8. Health Check

### `GET /health`

Public health check endpoint (unauthenticated).

#### Verified Live Request

```bash
curl -X GET "http://localhost:8080/health"
```

**Real Response:**
```json
{
  "status": "UP",
  "service": "loading-delivery-service",
  "database": "UP",
  "timestamp": "2026-10-03T12:32:17Z"
}
```

---

## Cumulative Required Changes Elsewhere

As per the strict monorepo boundary rules, the following changes are required in other services and infrastructure components to support the Loading & Delivery workflow end-to-end:

1. **API Gateway (`services/gateway` / `nginx`)**:
   - Forward `/api/loading/**` routes to `loading-delivery-service:8080`.
   - Ensure the gateway enforces JWT verification, attaches anti-spoofing header `X-Gateway-Verified: true`, and extracts claims into `X-User-Id`, `X-User-Role`, and `X-User-Email`.
   - Route `GET /api/loading/trips/{tripId}` and `POST /api/loading/trips/{tripId}/stops/{stopId}/start` to `loading-delivery-service:8080`.
   - Route `PUT /api/loading/trips/{tripId}/route-order` without stripping the `version` query parameter.
2. **Planning Service (`services/planning-service`)**:
   - Implement or ensure gRPC server is listening on port `9091` implementing `waypoint.planning.v1.PlanningService.GetTrip`.
   - When active, `loading-delivery-service` synchronizes route sequence, stop locations, and ETA changes directly via gRPC.
3. **Frontend (`frontend`)**:
   - In `LoadingPortalPage.tsx`, consume `/api/loading/trips/{tripId}` to render the Cargo Details view with `stops` in reverse delivery order (`load_order` 1..N).
   - Wire the "Start Loading" CTA on the next pending stop to invoke `POST /api/loading/trips/{tripId}/stops/{stopId}/start`.
   - Display reefer temperature telemetry (`reeferZone`) when chilled/frozen items are present.
   - Submit the complete stop UUID list and current loading confirmation version to the route-order endpoint, then render the returned stop list and success toast.
4. **RabbitMQ consumers**:
   - Bind downstream audit/notification consumers that need loading-order changes to routing key `loading.resequenced` and treat the event as idempotent.
