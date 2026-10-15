#!/usr/bin/env bash
set -euo pipefail
# Dedicated trusted Jenkins Linux runner only. Never load application .env files.
for tool in docker dotnet mvn go npm python3 trivy; do command -v "$tool" >/dev/null; done
docker info >/dev/null
python3 infrastructure/scripts/validate.py
for svc in loading-delivery-service notification-service; do
  (
    cd "services/$svc"
    test -z "$(gofmt -l $(git ls-files '*.go'))"
    go vet ./...
    go test -mod=readonly ./...
  )
done
dotnet test services/auth-service/Auth.sln --configuration Release
dotnet test services/api-gateway/Gateway.Tests/Gateway.Tests.csproj --configuration Release
for svc in order-service planning-service; do
  mvn -B -ntp -f "services/$svc/pom.xml" verify
 done
# Testcontainers must run, not silently skip integration coverage.
python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET
reports=list(Path('services/planning-service/target/surefire-reports').glob('*PlanningPostgresIntegrationTest.xml'))
assert reports, 'Planning integration test report missing'
for p in reports:
 r=ET.parse(p).getroot()
 assert int(r.get('tests','0')) > 0 and int(r.get('skipped','0')) == 0, 'Planning integration tests skipped'
PY
bash infrastructure/scripts/loading-integration.sh
(cd frontend && npm ci && npm test && npm run build)
trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --exit-code 1 .
