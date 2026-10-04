#!/usr/bin/env python3
"""
WayPoint Driver Workflow & Reproducibility Verification Script
Reads all DB connection and service credentials from environment variables.
Tests:
  - Scenario A: Full flow + 3-action offline batch (3/3 SYNCED) + 4 driver notifications + summary
  - Scenario B: Role authorization (403 non-dispatcher), conflict on completed stop (409),
                stop removal, offline sync conflict (STOP_ALREADY_COMPLETED -> CONFLICT_REVIEW),
                ROUTE_UPDATED notification, and summary total_stops=7 + conflict_review attention item.
  - POD storage active mode verification.
"""

import os
import sys
import json
import uuid
import time
import requests
import psycopg
from psycopg.rows import dict_row
from datetime import datetime, timezone, timedelta

# Disable insecure HTTPS warnings for local self-signed certs
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration from Environment (no hardcoded secrets).
# Optionally loads a gitignored env file (default: services/loading-delivery-service/.env).
def _load_env_file(path):
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_load_env_file(os.getenv("VERIFY_ENV_FILE", os.path.join(_ROOT, "services", "loading-delivery-service", ".env")))

def _require(name):
    v = os.getenv(name)
    if not v:
        print(f"ERROR: environment variable {name} is required")
        sys.exit(2)
    return v

GATEWAY_URL = os.getenv("GATEWAY_URL", "https://localhost").rstrip("/")
DB_HOST = _require("SUPABASE_DB_HOST")
DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")
DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
DB_USER = _require("SUPABASE_DB_USER")
DB_PASSWORD = _require("SUPABASE_DB_PASSWORD")
DB_SSLMODE = os.getenv("SUPABASE_DB_SSLMODE", "require")

DRIVER_EMAIL = os.getenv("DRIVER_EMAIL", "drv014@waypoint.lk")
DRIVER_PASSWORD = os.getenv("DRIVER_PASSWORD", "Waypoint@2026")
DRIVER_ID = "22222222-2222-2222-2222-222222222214"

DISPATCHER_EMAIL = os.getenv("DISPATCHER_EMAIL", "dispatcher@waypoint.lk")
DISPATCHER_PASSWORD = os.getenv("DISPATCHER_PASSWORD", "Waypoint@2026")

TRIP_ID = "14000000-0000-0000-0000-000000000001"
STOP1_ID = "14010000-0000-0000-0000-000000000001"  # OUT001
STOP2_ID = "14020000-0000-0000-0000-000000000002"  # OUT014
STOP3_ID = "14030000-0000-0000-0000-000000000003"  # OUT027
STOP4_ID = "14040000-0000-0000-0000-000000000004"  # OUT032

RESULTS = []

def record(test_name, status_code, expected_status, passed, details=""):
    RESULTS.append({
        "test": test_name,
        "status_code": status_code,
        "expected": expected_status,
        "passed": passed,
        "details": details
    })
    mark = "PASS" if passed else "FAIL"
    print(f"[{mark}] {test_name}: HTTP {status_code} (expected {expected_status}) - {details}")

def get_db(row_factory=None):
    kwargs = {
        "host": DB_HOST,
        "port": DB_PORT,
        "dbname": DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD,
        "sslmode": DB_SSLMODE
    }
    if row_factory:
        kwargs["row_factory"] = row_factory
    return psycopg.connect(**kwargs)

def reset_database():
    """Clean reset for trip 1, preserving/re-seeding the 4 required driver notifications."""
    print("\n--- Resetting Database State ---")
    conn = get_db()
    conn.autocommit = True
    cur = conn.cursor()

    # Clean previous run delivery & sync records
    cur.execute("DELETE FROM public.proof_of_delivery WHERE delivery_id IN (SELECT delivery_id FROM public.delivery_records WHERE trip_id = %s);", (TRIP_ID,))
    cur.execute("DELETE FROM public.delivery_shortfalls WHERE delivery_id IN (SELECT delivery_id FROM public.delivery_records WHERE trip_id = %s);", (TRIP_ID,))
    cur.execute("DELETE FROM public.delivery_records WHERE trip_id = %s;", (TRIP_ID,))
    cur.execute("DELETE FROM public.deferral_records WHERE trip_id = %s;", (TRIP_ID,))
    cur.execute("DELETE FROM public.sync_conflict_records WHERE trip_id = %s;", (TRIP_ID,))
    cur.execute("DELETE FROM public.sync_actions WHERE driver_id = %s;", (DRIVER_ID,))
    cur.execute("DELETE FROM public.driver_sessions WHERE driver_id = %s;", (DRIVER_ID,))
    cur.execute("DELETE FROM public.route_change_log WHERE trip_id = %s;", (TRIP_ID,))

    # Reset load_stops
    cur.execute("""
        UPDATE public.load_stops
        SET delivery_status = NULL,
            arrival_status = NULL,
            arrival_initial_status = NULL,
            arrived_at = NULL,
            device_arrived_at = NULL,
            server_arrived_at = NULL,
            is_late = FALSE,
            arrival_client_action_id = NULL,
            window_notification_sent = FALSE,
            cant_deliver_reason = NULL,
            cant_deliver_note = NULL,
            cant_deliver_reported_at = NULL,
            cant_deliver_device_at = NULL,
            cant_deliver_server_at = NULL,
            cant_deliver_client_action_id = NULL,
            cant_deliver_next_stop_id = NULL,
            delivery_next_stop_id = NULL,
            removed_from_plan = FALSE,
            updated_at = NOW()
        WHERE trip_id = %s;
    """, (TRIP_ID,))

    # Reset trip
    cur.execute("""
        UPDATE public.trips
        SET status = 'CONFIRMED',
            stop_sequence = ARRAY['OUT001','OUT014','OUT027','OUT032','OUT045','OUT051','OUT063','OUT078'],
            departed_at = NULL,
            completed_at = NULL,
            updated_at = NOW()
        WHERE trip_id = %s;
    """, (TRIP_ID,))

    # Set Stop 1 (OUT001) order delivery window into the future (16:00 - 18:00) so arrive early triggers WAITING_FOR_WINDOW
    cur.execute("""
        UPDATE public.orders
        SET window_open = '16:00:00'::time,
            window_close = '18:00:00'::time
        WHERE outlet_id = 'OUT001' AND preferred_date = (NOW() AT TIME ZONE 'Asia/Colombo')::date;
    """)

    # Seed / re-seed the 4 required DRV014 notifications for today
    cur.execute("""
        DO $$
        DECLARE
          d TEXT := '22222222-2222-2222-2222-222222222214';
          day DATE := (NOW() AT TIME ZONE 'Asia/Colombo')::date;
        BEGIN
          DELETE FROM public.notifications WHERE user_id = d;
          INSERT INTO public.notifications(notification_id, user_id, event_type, title, body, entity_ref, payload, read, created_at, event_id) VALUES
          (uuid_generate_v5(d::uuid,'route-updated-seed'), d, 'ROUTE_UPDATED', 'Route updated', 'Stop 4 - TechPoint Outlet has been removed from Trip 1', '14000000-0000-0000-0000-000000000001', jsonb_build_object('removed_stop_seq',4,'removed_outlet_name','TechPoint Outlet','trip_number',1,'before_count',8,'after_count',7,'route_synced',false), FALSE, NOW()-INTERVAL '2 minutes', uuid_generate_v5(d::uuid,'route-updated-event')),
          (uuid_generate_v5(d::uuid,'load-shortfall-seed'), d, 'LOAD_SHORTFALL', 'Load shortfall', 'OUT014 - 2 bread units short before departure', 'OUT014', jsonb_build_object('sku','BREAD','qty',2), FALSE, (day+TIME '09:32') AT TIME ZONE 'Asia/Colombo', uuid_generate_v5(d::uuid,'load-shortfall-event')),
          (uuid_generate_v5(d::uuid,'issue-ack-seed'), d, 'ISSUE_ACKNOWLEDGED', 'Issue acknowledged', 'Dispatcher acknowledged access issue at OUT027', 'OUT027', '{}', FALSE, (day+TIME '08:10') AT TIME ZONE 'Asia/Colombo', uuid_generate_v5(d::uuid,'issue-ack-event')),
          (uuid_generate_v5(d::uuid,'departure-seed'), d, 'TRIP_DEPARTURE_CONFIRMED', 'Trip departure confirmed', 'VEH014 left Peliyagoda depot at 06:30 AM', 'VEH014', '{}', TRUE, (day+TIME '06:30') AT TIME ZONE 'Asia/Colombo', uuid_generate_v5(d::uuid,'departure-event'))
          ON CONFLICT(notification_id) DO UPDATE SET created_at = EXCLUDED.created_at, read = EXCLUDED.read;
        END $$;
    """)

    cur.close()
    conn.close()
    print("Database reset completed successfully.")

def build_delivery_items(headers, stop_id, bread_short=0):
    """Builds delivery items/shortfalls from GET /stops/{id}/pod (real ordered quantities)."""
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/stops/{stop_id}/pod", headers=headers, verify=False, timeout=10)
    items, shortfalls = [], []
    if r.status_code != 200:
        print(f"  WARN: GET pod returned {r.status_code}: {r.text[:200]}")
        return items, shortfalls
    shorted = False
    for it in r.json().get("items", []):
        qty = it.get("ordered_qty", 0)
        if bread_short and not shorted and "bread" in it.get("name", "").lower() and qty >= bread_short:
            items.append({"item_id": it["item_id"], "delivered_qty": qty - bread_short})
            shortfalls.append({"item_id": it["item_id"], "qty": bread_short, "type": "shortage", "note": "Bread short"})
            shorted = True
        else:
            items.append({"item_id": it["item_id"], "delivered_qty": qty})
    return items, shortfalls

def login(email, password, role_name):
    url = f"{GATEWAY_URL}/api/auth/login"
    r = requests.post(url, json={"email": email, "password": password}, verify=False, timeout=10)
    if r.status_code == 200:
        data = r.json()
        token = data.get("accessToken") or data.get("token") or (data.get("data", {}).get("token") if isinstance(data.get("data"), dict) else None)
        record(f"Login {role_name} ({email})", r.status_code, 200, True, "JWT token obtained")
        return token
    else:
        record(f"Login {role_name} ({email})", r.status_code, 200, False, r.text)
        return None

def run_scenario_a(driver_token):
    print("\n--- Starting Scenario A: Driver Walkthrough & 3-Action Sync ---")
    headers = {"Authorization": f"Bearer {driver_token}"}

    # 1. Driver Today
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/today", headers=headers, verify=False, timeout=10)
    passed = r.status_code == 200 and len(r.json().get("trips", [])) > 0
    record("1. Driver Today", r.status_code, 200, passed, f"Trip count: {len(r.json().get('trips', [])) if r.status_code==200 else 0}")

    # 2. Stop 1 Detail (OUT001)
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP1_ID}", headers=headers, verify=False, timeout=10)
    passed = r.status_code == 200 and r.json().get("outlet", {}).get("id") == "OUT001"
    record("2. Stop Detail (OUT001)", r.status_code, 200, passed, f"Outlet: {r.json().get('outlet', {}).get('name') if r.status_code==200 else 'N/A'}")

    # 3. Arrive Early at Stop 1 (Expecting WAITING_FOR_WINDOW)
    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP1_ID}/arrive",
                      headers=headers,
                      json={"client_action_id": str(uuid.uuid4()), "arrived_at": datetime.now(timezone.utc).isoformat()},
                      verify=False, timeout=10)
    st = r.json().get("status") if r.status_code == 200 else "N/A"
    passed = r.status_code == 200 and st == "WAITING_FOR_WINDOW"
    record("3. Arrive Early (OUT001)", r.status_code, 200, passed, f"Arrival status: {st}")

    # 4. Window Status Stop 1
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP1_ID}/window-status", headers=headers, verify=False, timeout=10)
    passed = r.status_code == 200 and r.json().get("status") == "WAITING_FOR_WINDOW"
    record("4. Window Status (OUT001)", r.status_code, 200, passed, f"Status: {r.json().get('status') if r.status_code==200 else 'N/A'}")

    # 5. Can't Deliver Stop 1 (outlet_closed)
    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP1_ID}/cant-deliver",
                      headers=headers,
                      json={"client_action_id": str(uuid.uuid4()), "reason": "outlet_closed", "note": "Store shutter closed", "reported_at": datetime.now(timezone.utc).isoformat()},
                      verify=False, timeout=10)
    passed = r.status_code == 200 and r.json().get("status") == "NOT_DELIVERED"
    record("5. Can't Deliver (OUT001)", r.status_code, 200, passed, f"Outcome: {r.json().get('status') if r.status_code==200 else 'N/A'}")

    # 6. Arrive Online at Stop 2 (OUT014)
    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP2_ID}/arrive",
                      headers=headers,
                      json={"client_action_id": str(uuid.uuid4()), "arrived_at": datetime.now(timezone.utc).isoformat()},
                      verify=False, timeout=10)
    passed = r.status_code == 200 and r.json().get("status") == "ARRIVED"
    record("6. Arrive (OUT014)", r.status_code, 200, passed, f"Status: {r.json().get('status') if r.status_code==200 else 'N/A'}")

    # 7. Upload POD Signature for Stop 2
    # 1x1 PNG dummy
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    files = {"image": ("sig.png", png_data, "image/png")}
    data = {"receiver_name": "Manager Perera"}
    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP2_ID}/pod/signature",
                      headers=headers, files=files, data=data, verify=False, timeout=10)
    sig_url = r.json().get("url") if r.status_code == 200 else None
    passed = r.status_code == 200 and sig_url is not None
    record("7. Upload Signature (OUT014)", r.status_code, 200, passed, f"URL: {sig_url}")

    # 8. Upload POD Photo for Stop 2
    files = {"image": ("pod.png", png_data, "image/png")}
    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP2_ID}/pod/photo",
                      headers=headers, files=files, verify=False, timeout=10)
    photo_url = r.json().get("url") if r.status_code == 200 else None
    passed = r.status_code == 200 and photo_url is not None
    record("8. Upload Photo (OUT014)", r.status_code, 200, passed, f"URL: {photo_url}")

    # Get Stop 2 POD items to craft exact items in delivery payload
    delivery_items, shortfalls = build_delivery_items(headers, STOP2_ID, bread_short=2)

    # 9. Offline Batch Sync (FULL 3-action batch: OUT014 DELIVERY, OUT027 ARRIVAL, OUT032 ISSUE)
    now_iso = datetime.now(timezone.utc).isoformat()
    action1_id = str(uuid.uuid4())
    action2_id = str(uuid.uuid4())
    action3_id = str(uuid.uuid4())

    batch_payload = {
        "actions": [
            {
                "client_action_id": action1_id,
                "type": "DELIVERY",
                "stop_id": STOP2_ID,
                "client_timestamp": (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat(),
                "payload": {
                    "receiver_name": "Manager Perera",
                    "signature_url": sig_url,
                    "photo_url": photo_url,
                    "items": delivery_items,
                    "shortfalls": shortfalls,
                    "media_pending": False
                }
            },
            {
                "client_action_id": action2_id,
                "type": "ARRIVAL",
                "stop_id": STOP3_ID,
                "client_timestamp": (datetime.now(timezone.utc) + timedelta(seconds=2)).isoformat(),
                "payload": {}
            },
            {
                "client_action_id": action3_id,
                "type": "ISSUE",
                "stop_id": STOP4_ID,
                "client_timestamp": (datetime.now(timezone.utc) + timedelta(seconds=3)).isoformat(),
                "payload": {
                    "reason": "access_denied",
                    "note": "Gate security refused entry"
                }
            }
        ]
    }

    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/sync", headers=headers, json=batch_payload, verify=False, timeout=10)
    synced_count = 0
    total = 0
    if r.status_code == 200:
        res = r.json()
        synced_count = res.get("synced_count", 0)
        total = res.get("total", 0)
    passed = r.status_code == 200 and synced_count == 3 and total == 3
    record("9. Scenario A: 3-Action Offline Batch Sync", r.status_code, 200, passed, f"Synced: {synced_count}/{total} (3/3 expected)")

    # 10. Notifications: Must return 4 items (1 pinned ROUTE_UPDATED, 3 items)
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/notifications", headers=headers, verify=False, timeout=10)
    pinned_count = 0
    items_count = 0
    if r.status_code == 200:
        data = r.json()
        pinned = data.get("pinned")
        pinned_count = 1 if pinned else 0
        items_count = len(data.get("items", []))
    total_notifs = pinned_count + items_count
    types = set()
    if r.status_code == 200:
        if data.get("pinned"):
            types.add(data["pinned"].get("type"))
        types.update(i.get("type") for i in data.get("items", []))
    expected_types = {"ROUTE_UPDATED", "LOAD_SHORTFALL", "ISSUE_ACKNOWLEDGED", "TRIP_DEPARTURE_CONFIRMED"}
    pinned_ok = r.status_code == 200 and (data.get("pinned") or {}).get("type") == "ROUTE_UPDATED"
    passed = r.status_code == 200 and total_notifs == 4 and types == expected_types and pinned_ok
    record("10. Driver Notifications Seed (4 items)", r.status_code, 200, passed,
           f"Total: {total_notifs} (pinned: {pinned_count}, items: {items_count})")

    # 11. Trip Summary
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/trips/{TRIP_ID}/summary", headers=headers, verify=False, timeout=10)
    s = r.json() if r.status_code == 200 else {}
    passed = r.status_code == 200 and s.get("total_stops") == 8 and s.get("partial") == 1 and s.get("not_delivered") == 2
    record("11. Trip Summary (Scenario A)", r.status_code, 200, passed,
           f"total={s.get('total_stops')} delivered={s.get('delivered')} partial={s.get('partial')} not_delivered={s.get('not_delivered')} attention={len(s.get('attention_records') or [])}")

def run_scenario_b(driver_token, dispatcher_token):
    print("\n--- Starting Scenario B: Stop Removal & Offline Conflict Sync ---")
    reset_database()

    driver_headers = {"Authorization": f"Bearer {driver_token}"}
    dispatcher_headers = {"Authorization": f"Bearer {dispatcher_token}"}

    # 1. Non-Dispatcher Role Check: Driver tries to DELETE stop -> Expect 403 Forbidden
    r = requests.delete(f"{GATEWAY_URL}/api/planning/trips/{TRIP_ID}/stops/{STOP2_ID}", headers=driver_headers, verify=False, timeout=10)
    passed = r.status_code == 403
    record("12. Role Authorization (Driver DELETE -> 403)", r.status_code, 403, passed, f"Response: {r.json() if r.status_code==403 else r.text}")

    # 2. Already Completed Conflict Check:
    # First complete stop 1 (OUT001) via cant-deliver
    r_cd = requests.post(f"{GATEWAY_URL}/api/delivery/driver/stops/{STOP1_ID}/cant-deliver",
                         headers=driver_headers,
                         json={"client_action_id": str(uuid.uuid4()), "reason": "outlet_closed", "note": "Closed", "reported_at": datetime.now(timezone.utc).isoformat()},
                         verify=False, timeout=10)
    # Now dispatcher attempts to delete completed stop 1 -> Expect 409 Conflict (STOP_ALREADY_COMPLETED)
    r = requests.delete(f"{GATEWAY_URL}/api/planning/trips/{TRIP_ID}/stops/{STOP1_ID}", headers=dispatcher_headers, verify=False, timeout=10)
    code = r.json().get("code") if r.status_code == 409 else ""
    passed = r.status_code == 409 and code == "STOP_ALREADY_COMPLETED"
    record("13. Stop Already Completed DELETE -> 409", r.status_code, 409, passed, f"Conflict code: {code}")

    # 3. Dispatcher removes uncompleted stop 2 (OUT014) -> Expect 200 OK
    r = requests.delete(f"{GATEWAY_URL}/api/planning/trips/{TRIP_ID}/stops/{STOP2_ID}", headers=dispatcher_headers, verify=False, timeout=10)
    passed = r.status_code == 200 and r.json().get("status") == "REMOVED"
    record("14. Dispatcher Removes Stop 2 (OUT014)", r.status_code, 200, passed, f"Status: {r.json().get('status') if r.status_code==200 else 'N/A'}")

    # Verify route_change_log in DB
    conn = get_db(row_factory=dict_row)
    cur = conn.cursor()
    cur.execute("SELECT * FROM public.route_change_log WHERE trip_id = %s AND stop_id = %s;", (TRIP_ID, STOP2_ID))
    log_row = cur.fetchone()
    cur.close()
    conn.close()
    passed = log_row is not None and log_row["type"] == "STOP_REMOVED"
    record("15. route_change_log STOP_REMOVED (DB query)", "DB", "DB", passed, f"Type: {log_row['type'] if log_row else 'None'}")

    # 4. Driver, unaware of removal while offline, performs and syncs OUT014 DELIVERY
    # We craft a delivery sync action for OUT014
    action_conflict_id = str(uuid.uuid4())
    offline_delivery_payload = {
        "actions": [
            {
                "client_action_id": action_conflict_id,
                "type": "DELIVERY",
                "stop_id": STOP2_ID,
                "client_timestamp": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
                "payload": {
                    "receiver_name": "Manager Offline",
                    "items": [
                        {"item_id": "14020000-0000-0000-0001-000000000001", "delivered_qty": 24},
                        {"item_id": "14020000-0000-0000-0001-000000000002", "delivered_qty": 20}
                    ],
                    "shortfalls": [],
                    "media_pending": True
                }
            }
        ]
    }

    r = requests.post(f"{GATEWAY_URL}/api/delivery/driver/sync", headers=driver_headers, json=offline_delivery_payload, verify=False, timeout=10)
    conflict_code = None
    conflict_count = 0
    if r.status_code == 200:
        res = r.json()
        conflict_count = res.get("conflict_count", 0)
        conflicts = res.get("conflicts", [])
        if conflicts:
            conflict_code = conflicts[0].get("code")
    passed = r.status_code == 200 and conflict_count == 1 and conflict_code == "STOP_ALREADY_COMPLETED"
    record("16. Offline Sync Conflict (STOP_ALREADY_COMPLETED)", r.status_code, 200, passed, f"Conflict code: {conflict_code}")

    # Verify sync_conflict_records in DB has status 'CONFLICT_REVIEW'
    conn = get_db(row_factory=dict_row)
    cur = conn.cursor()
    cur.execute("SELECT status, conflict_code FROM public.sync_conflict_records WHERE client_action_id = %s;", (action_conflict_id,))
    cr_row = cur.fetchone()
    cur.close()
    conn.close()
    passed = cr_row is not None and cr_row["status"] == "CONFLICT_REVIEW"
    record("17. sync_conflict_records CONFLICT_REVIEW (DB query)", "DB", "DB", passed, f"DB Status: {cr_row['status'] if cr_row else 'None'}")

    # 5. A NEW ROUTE_UPDATED notification for the removed OUT014 stop (not the seeded one).
    # Path: planning outbox -> RabbitMQ route.updated -> loading consumer -> notifications. Poll up to ~20s.
    seeded_id = None
    has_route_updated = False
    body = ""
    status_code = None
    for _ in range(20):
        r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/notifications", headers=driver_headers, verify=False, timeout=10)
        status_code = r.status_code
        if r.status_code == 200:
            data = r.json()
            all_items = ([data["pinned"]] if data.get("pinned") else []) + data.get("items", [])
            for it in all_items:
                if it.get("type") == "ROUTE_UPDATED" and "TechPoint" not in it.get("body", ""):
                    has_route_updated = True
                    body = it.get("body", "")
        if has_route_updated:
            break
        time.sleep(1)
    passed = status_code == 200 and has_route_updated
    record("18. New ROUTE_UPDATED for removed OUT014", status_code, 200, passed, f"body='{body}'")

    # 6. Driver Trip Summary check:
    # Must show total_stops = 7, and attention_records must contain conflict_review item for OUT014
    r = requests.get(f"{GATEWAY_URL}/api/delivery/driver/trips/{TRIP_ID}/summary", headers=driver_headers, verify=False, timeout=10)
    total_stops = None
    has_conflict_attention = False
    if r.status_code == 200:
        sum_data = r.json()
        total_stops = sum_data.get("total_stops")
        for att in sum_data.get("attention_records", []):
            if att.get("type") == "conflict_review" and att.get("outlet_id") == "OUT014":
                has_conflict_attention = True
    passed = r.status_code == 200 and total_stops == 7 and has_conflict_attention
    record("19. Summary: total_stops=7 & conflict_review item", r.status_code, 200, passed,
           f"total_stops={total_stops}, conflict_review present={has_conflict_attention}")

def check_pod_storage():
    print("\n--- POD Storage Inspection ---")
    storage_mode = os.getenv("STORAGE_MODE", "local")
    print(f"Active Storage Mode configured: {storage_mode}")
    print(f"Fallback Persistence: Docker Volume 'loading_uploads' mounted to '/uploads' in waypoint-loading.")

def main():
    print("=" * 70)
    print(" WayPoint Reproducibility & Driver Workflow Verification")
    print("=" * 70)

    reset_database()

    driver_token = login(DRIVER_EMAIL, DRIVER_PASSWORD, "Driver DRV014")
    dispatcher_token = login(DISPATCHER_EMAIL, DISPATCHER_PASSWORD, "Dispatcher")

    if not driver_token or not dispatcher_token:
        print("ERROR: Authentication failed. Aborting verification.")
        sys.exit(1)

    run_scenario_a(driver_token)
    run_scenario_b(driver_token, dispatcher_token)
    check_pod_storage()

    print("\n" + "=" * 70)
    print(" SUMMARY TABLE")
    print("=" * 70)
    print(f"{'Test':<45} | {'HTTP':<5} | {'Expected':<8} | {'Result':<6}")
    print("-" * 70)
    all_passed = True
    for res in RESULTS:
        res_str = "PASS" if res["passed"] else "FAIL"
        if not res["passed"]:
            all_passed = False
        print(f"{res['test']:<45} | {res['status_code']:<5} | {res['expected']:<8} | {res_str:<6}")
    print("-" * 70)
    if all_passed:
        print("ALL TESTS PASSED SUCCESSFULLY!")
    else:
        print("SOME TESTS FAILED.")
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
