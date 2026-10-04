# docs
Project documentation: architecture, data models, AI disclosure.
# Waypoint documentation

## Driver walkthrough

The seeded driver is **DRV014 Kumar**, assigned to **VEH014 Van** at the
Peliyagoda depot. API Gateway supplies the verified driver headers shown below.

```bash
curl "http://localhost:8080/api/delivery/driver/today" -H "X-Gateway-Verified: true" -H "X-User-Id: 22222222-2222-2222-2222-222222222214" -H "X-User-Role: DRIVER"
curl "http://localhost:8080/api/delivery/driver/stops/14030000-0000-0000-0000-000000000003" -H "X-Gateway-Verified: true" -H "X-User-Id: 22222222-2222-2222-2222-222222222214" -H "X-User-Role: DRIVER"
```

The demo flow is: view Today → open stop detail → arrive early and poll the
window → capture POD and confirm a partial delivery → advance to the next stop →
record can’t-deliver → replay offline actions → review notifications → open the
trip summary and complete the trip. Full requests and response contracts are in
[driver-api.md](driver-api.md); the machine-readable contract is
[driver-openapi.yaml](driver-openapi.yaml).

The unreviewed TechPoint/OUT032 route notification belongs to the main demo.
The removed OUT014 offline-delivery conflict is a separate test fixture and does
not mutate that demo seed.
