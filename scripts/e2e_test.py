import urllib.request, json, time, sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8080"

print("=" * 60)
print("WAYPOINT FULL END-TO-END TEST")
print("=" * 60)

# ── 1. Login ──────────────────────────────────────────────────
print("\n[1] LOGIN via gateway (/api/auth/login)")
token = None
user_info = None
for attempt in range(3):
    try:
        data = json.dumps({'email': 'drv014@waypoint.lk', 'password': 'Waypoint@2026'}).encode()
        req = urllib.request.Request(f'{BASE}/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            login_res = json.loads(resp.read().decode())
            token = login_res.get('accessToken') or login_res.get('access_token') or login_res.get('token')
            user_info = login_res.get('user') or login_res.get('User') or {}
            print(f"  [OK] Login SUCCESS! Role: {user_info.get('role') or user_info.get('Role')}, Email: {user_info.get('email') or user_info.get('Email')}")
            print(f"  Token (first 30 chars): {str(token)[:30]}...")
        break
    except Exception as e:
        print(f"  Attempt {attempt+1} failed: {e}")
        if hasattr(e, 'read'):
            print(f"  Body: {e.read().decode()}")
        time.sleep(2)

if not token:
    print("ABORT: Login failed, cannot continue")
    exit(1)

auth_headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# ── 2. Driver Today ─────────────────────────────────────────
print("\n[2] GET /api/delivery/driver/today")
trip_id = None
try:
    req = urllib.request.Request(f'{BASE}/api/delivery/driver/today', headers=auth_headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        today_res = json.loads(resp.read().decode())
        trips = today_res.get('trips', [])
        print(f"  [OK] Got {len(trips)} trip(s)")
        if trips:
            trip_id = trips[0].get('trip_id')
            print(f"  Trip ID: {trip_id}, Number: {trips[0].get('trip_number')}, Status: {trips[0].get('status')}")
except Exception as e:
    print(f"  [FAIL] Failed: {e}")
    if hasattr(e, 'read'):
        print(f"  Body: {e.read().decode()}")

# ── 3. Route ────────────────────────────────────────────────
if trip_id:
    print(f"\n[3] GET /api/delivery/driver/trips/{trip_id}/route?lat=6.9271&lng=79.8612")
    try:
        req = urllib.request.Request(
            f'{BASE}/api/delivery/driver/trips/{trip_id}/route?lat=6.9271&lng=79.8612',
            headers=auth_headers
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            route_res = json.loads(resp.read().decode())
            stops = route_res.get('stops', [])
            print(f"  [OK] Route returned {len(stops)} stops")
            print(f"  route_source: {route_res.get('route_source')}")
            next_s = route_res.get('next_stop')
            if next_s:
                print(f"  next_stop: {next_s.get('name')} (seq={next_s.get('seq')})")
            print(f"  has route_geometry: {route_res.get('route_geometry') is not None}")
    except Exception as e:
        print(f"  [FAIL] Failed: {e}")
        if hasattr(e, 'read'):
            print(f"  Body: {e.read().decode()}")

    # ── 4. Route Geometry ─────────────────────────────────────
    print(f"\n[4] GET /api/delivery/driver/trips/{trip_id}/route/geometry")
    try:
        req = urllib.request.Request(
            f'{BASE}/api/delivery/driver/trips/{trip_id}/route/geometry',
            headers=auth_headers
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            geom_res = json.loads(resp.read().decode())
            print(f"  [OK] Geometry type: {geom_res.get('type')}")
    except Exception as e:
        print(f"  [FAIL] Failed: {e}")
        if hasattr(e, 'read'):
            print(f"  Body: {e.read().decode()}")

# ── 5. Gateway health ────────────────────────────────────────
print("\n[5] GET /health (gateway)")
try:
    req = urllib.request.Request(f'{BASE}/health')
    with urllib.request.urlopen(req, timeout=5) as resp:
        print(f"  [OK] Health: {resp.status} {resp.read().decode()}")
except Exception as e:
    print(f"  [FAIL] Health failed: {e}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
