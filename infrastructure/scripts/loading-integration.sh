#!/usr/bin/env bash
set -euo pipefail
# Generate a uniquely named, isolated fixture using the existing migration list.
# Dynamic loopback ports avoid conflicts; no production env files or database URLs.
fixture=$(mktemp /tmp/waypoint-ci-XXXXXX.yaml)
project="waypoint-ci-${BUILD_NUMBER:-local}-$$"
cleanup() { docker compose -p "$project" -f "$fixture" down --volumes; rm -f "$fixture"; }
trap cleanup EXIT
python3 - "$fixture" <<'PY'
import pathlib,sys,yaml,secrets
source=pathlib.Path('services/loading-delivery-service/docker-compose.test.yml').resolve()
doc=yaml.safe_load(source.read_text());doc.pop('version',None)
for name,svc in doc['services'].items():
 svc.pop('container_name',None)
 svc['ports']=['127.0.0.1::'+('5432' if name=='test-db' else '5672')]
 svc['volumes']=[str((source.parent/v.split(':')[0]).resolve())+':'+':'.join(v.split(':')[1:]) for v in svc.get('volumes',[])]
# Disposable fixture password; never used by deployed services.
pwd=secrets.token_hex(24)
doc['services']['test-db']['environment']['POSTGRES_PASSWORD']=pwd
pathlib.Path(sys.argv[1]).write_text(yaml.safe_dump(doc))
pathlib.Path(sys.argv[1]).chmod(0o600)
PY
docker compose -p "$project" -f "$fixture" up -d --wait --wait-timeout 180
db_port=$(docker compose -p "$project" -f "$fixture" port test-db 5432)
amqp_port=$(docker compose -p "$project" -f "$fixture" port test-rabbitmq 5672)
fixture_password=$(python3 -c 'import yaml,sys; print(yaml.safe_load(open(sys.argv[1]))["services"]["test-db"]["environment"]["POSTGRES_PASSWORD"])' "$fixture")
export TEST_DATABASE_URL="postgres://postgres:${fixture_password}@${db_port}/waypoint_test?sslmode=disable"
export TEST_RABBITMQ_URL="amqp://guest:guest@${amqp_port}/"
(cd services/loading-delivery-service && go test -mod=readonly -tags=integration -count=1 ./internal/repository/...)
