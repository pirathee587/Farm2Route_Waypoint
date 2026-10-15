#!/bin/sh
# Repair the schema gaps confirmed in the October 10 API logs.
# Run from the repository root with: sudo sh infra/postgres/repair-api-schema.sh
set -eu
cd "$(dirname "$0")/../.."
umask 077
backup=$(mktemp /tmp/waypoint-before-schema-repair.XXXXXX.dump)
docker compose -f compose.yaml exec -T postgres sh -c \
  'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$backup"
echo "Database backup: $backup"

# Only the schema migrations needed for the observed errors; no demo seed replay.
for migration in \
  20261004000001_driver.sql \
  20261004000006_arrival_flow.sql \
  20261004000007_cant_deliver.sql \
  20261004000008_proof_of_delivery.sql \
  20261005000001_order_confirmation_lifecycle.sql
do
  echo "Applying $migration"
  docker compose -f compose.yaml exec -T postgres sh -c \
    'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    < "supabase/migrations/$migration"
done
echo "Known API schema gaps repaired. Refresh the dashboard and check service logs."
echo "Other migrations after the original initialization failure may still be pending."
