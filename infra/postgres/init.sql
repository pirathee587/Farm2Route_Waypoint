-- ═══════════════════════════════════════════════════════════════════════
--  Waypoint — PostgreSQL Init Script
--  Creates a separate database per service (single postgres instance)
--  Run automatically by docker-entrypoint-initdb.d on first start
-- ═══════════════════════════════════════════════════════════════════════

-- Auth Service DB
CREATE DATABASE auth_db;

-- Order Service DB
CREATE DATABASE order_db;

-- Planning Service DB
CREATE DATABASE planning_db;

-- Loading & Delivery Service DB
CREATE DATABASE loading_db;

-- Notification Service DB
CREATE DATABASE notification_db;

-- ── Grant the app user full access to each DB ──────────────────────────
GRANT ALL PRIVILEGES ON DATABASE auth_db         TO waypoint;
GRANT ALL PRIVILEGES ON DATABASE order_db        TO waypoint;
GRANT ALL PRIVILEGES ON DATABASE planning_db     TO waypoint;
GRANT ALL PRIVILEGES ON DATABASE loading_db      TO waypoint;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO waypoint;
