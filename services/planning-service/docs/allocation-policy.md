# Allocation policy

Orders are sorted deterministically by: deferred yesterday first; days since the outlet was last served descending; Fresh, Style, then Tech for early-window work; order value per combined weight/volume descending; finally order UUID.

Every trip contains one brand and one district. Orders remain whole. Vehicle temperature, van-only access, home depot, weight, volume, two-trip limit, daily time budget, delivery windows, weekly fuel quota, and workshop status are hard constraints. Fresh has a 270-minute daily budget per vehicle; Style and Tech share a 480-minute budget. An outlet deferred in the previous run is tried first and may only be deferred again when no feasible assignment exists; the returned explanation explicitly says that it remained infeasible despite priority.

The engine is deterministic: equal inputs and reference data produce equal vehicle/trip/stop assignments.
