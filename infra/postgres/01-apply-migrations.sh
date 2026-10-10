#!/bin/sh
set -eu

for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
  case "$migration" in
    *.rollback.sql|*/precheck_*) continue ;;
  esac
  echo "Applying $(basename "$migration")"
  psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file "$migration"
done
