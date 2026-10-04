# Delivery event contracts

## `ROUTE_UPDATED` (`route.updated`)

Published by a dispatcher/planning route edit. The consumer is idempotent by `event_id`.

```json
{
  "event_id": "uuid",
  "trip_id": "uuid",
  "removed_stop_id": "uuid",
  "actor": "dispatcher user id",
  "occurred_at": "RFC3339 timestamp"
}
```

The loading-delivery service resolves the affected driver and computes stop counts from the current trip plan.

## Route change log responsibility

The dispatcher/planning side must insert one `route_change_log` row whenever a
trip stop is removed, added, or reordered. Required values are `trip_id`,
`stop_id`, `type` (`STOP_REMOVED`, `STOP_ADDED`, or `STOP_REORDERED`), `actor`,
and `occurred_at`. Offline sync reads this log after the driver's previous
`last_synced_at`.

For trip reassignment, planning must preserve `load_stops.original_driver_id`
so offline records from the original driver become `STOP_REASSIGNED` conflicts
instead of arbitrary cross-driver access.
