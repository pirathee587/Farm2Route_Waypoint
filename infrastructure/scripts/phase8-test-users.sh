#!/usr/bin/env bash
set -euo pipefail

# Prepared only. Run manually as root in an interactive SSM session after approval.
# This script never inserts into auth.users; Supabase identities are created and
# deleted through the Supabase Admin API.

readonly ENV_FILE=/root/.config/waypoint/phase8-test-users.env
readonly IDS_FILE=/run/waypoint/phase8-test-user-ids.env
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ ! -f ${ENV_FILE} ]]; then
  echo "Missing ${ENV_FILE}." >&2
  exit 1
fi
if [[ $(stat -c '%a' "${ENV_FILE}") != 600 || $(stat -c '%u' "${ENV_FILE}") != 0 ]]; then
  echo "${ENV_FILE} must be owned by root with mode 600." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

required=(
  SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY TEST_USER_PASSWORD
  PHASE8_STORE_MANAGER_EMAIL PHASE8_DISPATCHER_EMAIL
  PHASE8_LOADER_EMAIL PHASE8_DRIVER_EMAIL
  PHASE8_OUTLET_ID PHASE8_VEHICLE_ID PHASE8_DEPOT
  PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSSLMODE
)
for name in "${required[@]}"; do
  if [[ -z ${!name:-} ]]; then
    echo "Required variable ${name} is not set." >&2
    exit 1
  fi
done

mkdir -p /run/waypoint
chmod 700 /run/waypoint

admin_api() {
  local action=$1
  python3 - "${action}" "${IDS_FILE}" <<'PY'
import json
import os
import pathlib
import shlex
import sys
import urllib.error
import urllib.request

action = sys.argv[1]
ids_path = pathlib.Path(sys.argv[2])
base = os.environ["SUPABASE_URL"].rstrip("/")
service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
users = [
    ("STORE_MANAGER", os.environ["PHASE8_STORE_MANAGER_EMAIL"], "Phase 8 Store Manager"),
    ("DISPATCHER", os.environ["PHASE8_DISPATCHER_EMAIL"], "Phase 8 Dispatcher"),
    ("LOADER", os.environ["PHASE8_LOADER_EMAIL"], "Phase 8 Loader"),
    ("DRIVER", os.environ["PHASE8_DRIVER_EMAIL"], "Phase 8 Driver"),
]
headers = {
    "apikey": service_key,
    "Authorization": "Bearer " + service_key,
    "Content-Type": "application/json",
}

def call(method, path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(base + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        # Deliberately omit the response body because providers may include
        # request details. Status and role are sufficient for safe diagnosis.
        raise RuntimeError(f"Supabase Admin API returned HTTP {error.code}") from None

if action == "create":
    if ids_path.exists():
        raise SystemExit(f"Refusing to overwrite existing {ids_path}")
    created = []
    try:
        for role, email, full_name in users:
            status, body = call("POST", "/auth/v1/admin/users", {
                "email": email,
                "password": os.environ["TEST_USER_PASSWORD"],
                "email_confirm": True,
                "user_metadata": {"full_name": full_name, "role": role},
            })
            user_id = json.loads(body)["id"]
            created.append((role, email, user_id))
            print(f"Admin API create {role}: HTTP {status}")
    except Exception:
        for role, _, user_id in reversed(created):
            try:
                status, _ = call("DELETE", "/auth/v1/admin/users/" + user_id)
                print(f"Admin API rollback {role}: HTTP {status}")
            except Exception:
                print(f"Admin API rollback {role}: FAILED", file=sys.stderr)
        raise
    names = {
        "STORE_MANAGER": "PHASE8_STORE_MANAGER_ID",
        "DISPATCHER": "PHASE8_DISPATCHER_ID",
        "LOADER": "PHASE8_LOADER_ID",
        "DRIVER": "PHASE8_DRIVER_ID",
    }
    text = "".join(f"{names[role]}={shlex.quote(user_id)}\n" for role, _, user_id in created)
    ids_path.write_text(text)
    ids_path.chmod(0o600)
elif action == "delete":
    values = {}
    for line in ids_path.read_text().splitlines():
        key, value = line.split("=", 1)
        values[key] = value.strip("'")
    names = {
        "STORE_MANAGER": "PHASE8_STORE_MANAGER_ID",
        "DISPATCHER": "PHASE8_DISPATCHER_ID",
        "LOADER": "PHASE8_LOADER_ID",
        "DRIVER": "PHASE8_DRIVER_ID",
    }
    for role, variable in names.items():
        status, _ = call("DELETE", "/auth/v1/admin/users/" + values[variable])
        print(f"Admin API delete {role}: HTTP {status}")
else:
    raise SystemExit("Expected create or delete")
PY
}

case ${1:-} in
  create)
    admin_api create
    set -a
    # shellcheck disable=SC1090
    source "${IDS_FILE}"
    set +a
    if ! psql -X -v ON_ERROR_STOP=1 -f "${SCRIPT_DIR}/phase8-test-users-provision.sql"; then
      echo "Application-profile provisioning failed; rolling back Admin API identities." >&2
      admin_api delete
      rm -f "${IDS_FILE}"
      exit 1
    fi
    echo "Phase 8 test identities and application profiles created."
    ;;
  cleanup)
    if [[ ! -f ${IDS_FILE} ]]; then
      echo "Missing ${IDS_FILE}; cleanup requires the recorded Admin API user IDs." >&2
      exit 1
    fi
    set -a
    # shellcheck disable=SC1090
    source "${IDS_FILE}"
    set +a
    psql -X -v ON_ERROR_STOP=1 -f "${SCRIPT_DIR}/phase8-test-users-cleanup.sql"
    admin_api delete
    rm -f "${IDS_FILE}"
    echo "Phase 8 test profiles and Supabase identities removed."
    ;;
  *)
    echo "Usage: $0 create|cleanup" >&2
    exit 2
    ;;
esac
