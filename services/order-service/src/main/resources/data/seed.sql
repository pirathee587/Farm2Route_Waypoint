-- Order Service reference-data seed.
-- Expected files in this directory: outlets.csv, vehicles.csv, calendar.csv.
-- Run with psql from this directory, or adjust the three CSV paths below.

BEGIN;

CREATE TEMP TABLE seed_outlets (
  outlet_id TEXT,
  brand TEXT,
  district TEXT,
  depot TEXT,
  dock_type TEXT,
  parking_constraint TEXT,
  mall_window_open TIME,
  mall_window_close TIME,
  window_open_time TIME,
  window_close_time TIME
) ON COMMIT DROP;

\copy seed_outlets FROM 'outlets.csv' WITH (FORMAT csv, HEADER true)

INSERT INTO public.outlets (
  outlet_id, brand, district, depot, dock_type, parking_constraint,
  mall_window_open, mall_window_close, window_open_time, window_close_time
)
SELECT
  outlet_id,
  brand::public.order_brand,
  district,
  depot,
  dock_type::public.dock_type,
  parking_constraint::public.parking_constraint,
  mall_window_open,
  mall_window_close,
  window_open_time,
  window_close_time
FROM seed_outlets
ON CONFLICT (outlet_id) DO UPDATE SET
  brand = EXCLUDED.brand,
  district = EXCLUDED.district,
  depot = EXCLUDED.depot,
  dock_type = EXCLUDED.dock_type,
  parking_constraint = EXCLUDED.parking_constraint,
  mall_window_open = EXCLUDED.mall_window_open,
  mall_window_close = EXCLUDED.mall_window_close,
  window_open_time = EXCLUDED.window_open_time,
  window_close_time = EXCLUDED.window_close_time;

CREATE TEMP TABLE seed_vehicles (
  vehicle_id TEXT,
  type TEXT,
  temp TEXT,
  weight_cap_kg NUMERIC,
  volume_cap_m3 NUMERIC,
  fuel_type TEXT,
  km_per_l NUMERIC,
  weekly_fuel_quota_l NUMERIC,
  depot TEXT
) ON COMMIT DROP;

\copy seed_vehicles FROM 'vehicles.csv' WITH (FORMAT csv, HEADER true)

INSERT INTO public.vehicles (
  vehicle_id, type, temp, weight_cap_kg, volume_cap_m3,
  fuel_type, km_per_l, weekly_fuel_quota_l, depot
)
SELECT
  vehicle_id,
  type::public.vehicle_kind,
  temp::public.vehicle_temp,
  weight_cap_kg,
  volume_cap_m3,
  fuel_type,
  km_per_l,
  weekly_fuel_quota_l,
  depot
FROM seed_vehicles
ON CONFLICT (vehicle_id) DO UPDATE SET
  type = EXCLUDED.type,
  temp = EXCLUDED.temp,
  weight_cap_kg = EXCLUDED.weight_cap_kg,
  volume_cap_m3 = EXCLUDED.volume_cap_m3,
  fuel_type = EXCLUDED.fuel_type,
  km_per_l = EXCLUDED.km_per_l,
  weekly_fuel_quota_l = EXCLUDED.weekly_fuel_quota_l,
  depot = EXCLUDED.depot;

CREATE TEMP TABLE seed_calendar (
  date DATE,
  dow SMALLINT,
  dow_name TEXT,
  is_weekend BOOLEAN,
  iso_year SMALLINT,
  iso_week SMALLINT,
  is_payday BOOLEAN,
  festival TEXT,
  festival_ramp BOOLEAN,
  is_holiday BOOLEAN,
  monsoon BOOLEAN,
  is_operating BOOLEAN
) ON COMMIT DROP;

\copy seed_calendar FROM 'calendar.csv' WITH (FORMAT csv, HEADER true)

INSERT INTO public.calendar (
  date, dow, dow_name, is_weekend, iso_year, iso_week, is_payday,
  festival, festival_ramp, is_holiday, monsoon, is_operating
)
SELECT
  date, dow, dow_name, is_weekend, iso_year, iso_week, is_payday,
  festival, festival_ramp, is_holiday, monsoon, is_operating
FROM seed_calendar
ON CONFLICT (date) DO UPDATE SET
  dow = EXCLUDED.dow,
  dow_name = EXCLUDED.dow_name,
  is_weekend = EXCLUDED.is_weekend,
  iso_year = EXCLUDED.iso_year,
  iso_week = EXCLUDED.iso_week,
  is_payday = EXCLUDED.is_payday,
  festival = EXCLUDED.festival,
  festival_ramp = EXCLUDED.festival_ramp,
  is_holiday = EXCLUDED.is_holiday,
  monsoon = EXCLUDED.monsoon,
  is_operating = EXCLUDED.is_operating;

COMMIT;