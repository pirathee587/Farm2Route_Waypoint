# Driver API

Base URL: `http://localhost:8080`. Every route requires `X-Gateway-Verified: true`, `X-User-Id`, and `X-User-Role: DRIVER`. Times are RFC3339 values stored as `timestamptz` and returned in Asia/Colombo where applicable. Errors use `{"error":"..."}` and may include `code`.

## Today, stops and routing

| Method and path | Request | Successful response |
|---|---|---|
| `GET /api/delivery/driver/today?date=YYYY-MM-DD` | Optional date | Driver, vehicle, trips, derived stop status and progress |
| `GET /api/delivery/driver/trips/{tripId}/stops` | — | Full trip with stops |
| `GET /api/delivery/driver/dispatcher-contact` | — | `{"phone":"..."}` |
| `GET /api/delivery/driver/stops/{stopId}` | — | Outlet, window, requirements, items, previous skip and `can_arrive` |
| `GET /api/delivery/driver/trips/{tripId}/route?lat=&lng=` | Optional current coordinate | Next stop, instruction, route geometry and source |
| `GET /api/delivery/driver/trips/{tripId}/route/geometry` | — | Remaining trip LineString and source |

Example:

```bash
curl "http://localhost:8080/api/delivery/driver/today" -H "X-Gateway-Verified: true" -H "X-User-Id: 22222222-2222-2222-2222-222222222214" -H "X-User-Role: DRIVER"
```

## Arrival, issue and POD

| Method and path | Request example | Successful response |
|---|---|---|
| `POST /stops/{stopId}/arrive` | `{"client_action_id":"uuid","arrived_at":"2026-10-04T09:35:00+05:30"}` | Arrival/waiting status and window timing |
| `GET /stops/{stopId}/window-status` | — | Current time, window open time and arrival availability |
| `GET /cant-deliver/reasons` | — | Supported reason codes and labels |
| `POST /stops/{stopId}/cant-deliver` | `{"client_action_id":"uuid","reason":"access_denied","note":"...","reported_at":"..."}` | `NOT_DELIVERED`, event status and next stop |
| `GET /stops/{stopId}/pod` | — | Outlet, arrived time, ordered items and defaults |
| `POST /stops/{stopId}/pod/signature` | Multipart `image`, `receiver_name` | Private storage URL and upload time |
| `POST /stops/{stopId}/pod/photo` | Multipart `image` | Private storage URL and upload time |
| `POST /stops/{stopId}/confirm` | Items, shortfalls, receiver, signature/photo URLs and `completed_at` | Outcome, completion time and next stop |

All write operations use a UUID `client_action_id`. Image endpoints accept JPEG/PNG magic bytes up to 5 MB.

## Profile and notifications

| Method and path | Request | Successful response |
|---|---|---|
| `GET /profile` | — | Driver, assigned vehicle, connection and queue count |
| `POST /heartbeat` | `{"client_time":"...","pending_actions_count":2}` | Server time and clock skew |
| `GET /history?from=&to=&page=` | Up to 31 days | Paginated driver trips |
| `GET /notifications` | — | Unread count, pinned route update and today items |
| `POST /notifications/{id}/review` | — | Reviewed notification |
| `POST /notifications/read-all` | — | Non-route notifications marked read |
| `GET /notifications/history?page=&from=&to=` | Up to 31 days | Paginated history |

## Offline synchronization

`POST /api/delivery/driver/sync` accepts up to 100 chronologically replayed `ARRIVAL`, `DELIVERY`, and `ISSUE` actions:

```json
{"actions":[{"client_action_id":"uuid","type":"ARRIVAL","stop_id":"uuid","client_timestamp":"2026-10-04T09:35:00+05:30","payload":{}}]}
```

The response contains per-action `SYNCED`, `DUPLICATE`, `CONFLICT`, or `FAILED` status, counts, route changes, retained conflicts, pending media IDs and `last_synced_at`.

| Method and path | Request | Successful response |
|---|---|---|
| `POST /sync/verify` | `{"client_action_ids":["uuid"]}` | Stored status or `UNKNOWN` per ID |
| `GET /sync/conflicts` | — | Open read-only `CONFLICT_REVIEW` records |
| `POST /sync/media/{client_action_id}` | Multipart `signature`, `photo` | `pod_media_status: COMPLETE` and URLs |

## Trip completion

| Method and path | Request | Successful response |
|---|---|---|
| `GET /trips/{tripId}/summary` | — | Counts, percentage, first four outcomes and attention records |
| `GET /trips/{tripId}/outcomes?page=1` | — | Outcomes, 20 per page |
| `POST /trips/{tripId}/complete` | — | Completed trip summary; idempotent |

Trip completion also occurs automatically when the final non-removed stop receives an outcome.

## Error codes

Common statuses are `400 BAD_REQUEST`, `401 UNAUTHORIZED`, `403 FORBIDDEN`/`GATEWAY_UNVERIFIED`, `404 NOT_FOUND`, `409 CONFLICT`, `422 VALIDATION_FAILED`, and `429 RATE_LIMITED`. Sync action errors additionally include `FUTURE_TIMESTAMP`, `DEPENDENCY_FAILED`, `STOP_ALREADY_COMPLETED`, `STOP_REASSIGNED`, and `STOP_ALREADY_HAS_OUTCOME`.
