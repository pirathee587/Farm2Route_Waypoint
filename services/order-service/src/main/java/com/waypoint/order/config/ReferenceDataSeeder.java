package com.waypoint.order.config;

import com.opencsv.CSVReaderHeaderAware;
import com.waypoint.order.repository.CalendarRepository;
import com.waypoint.order.repository.OutletRepository;
import com.waypoint.order.repository.VehicleRepository;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(1)
public class ReferenceDataSeeder implements CommandLineRunner {
    private final OutletRepository outlets;
    private final VehicleRepository vehicles;
    private final CalendarRepository calendar;
    private final JdbcTemplate jdbc;

    @Value("classpath:data/outlets.csv") private Resource outletsResource;
    @Value("classpath:data/vehicles.csv") private Resource vehiclesResource;
    @Value("classpath:data/calendar.csv") private Resource calendarResource;

    public ReferenceDataSeeder(OutletRepository outlets, VehicleRepository vehicles,
                               CalendarRepository calendar, JdbcTemplate jdbc) {
        this.outlets = outlets;
        this.vehicles = vehicles;
        this.calendar = calendar;
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedOutlets();
        seedVehicles();
        seedCalendar();
    }

    private void seedOutlets() throws Exception {
        read(outletsResource, row -> jdbc.update("""
            INSERT INTO public.outlets(outlet_id,name,brand,district,depot,dock_type,parking_constraint,
              parking_type,mall_window_open,mall_window_close,window_open_time,window_close_time)
            VALUES (?,?,?::public.order_brand,?,?,?::public.dock_type,?::public.parking_constraint,
              CASE WHEN lower(?) IN ('van_only','mall_dock') THEN 'RESTRICTED'::public.parking_type ELSE 'STANDARD'::public.parking_type END,
              NULLIF(?,'')::time,NULLIF(?,'')::time,NULLIF(?,'')::time,NULLIF(?,'')::time)
            ON CONFLICT (outlet_id) DO NOTHING
            """, row.get("outlet_id"), row.get("name"), row.get("brand"), row.get("district"), row.get("depot"),
            row.get("dock_type"), row.get("parking_constraint"), row.get("parking_constraint"),
            row.get("mall_window_open"), row.get("mall_window_close"), row.get("window_open_time"), row.get("window_close_time")));
    }

    private void seedVehicles() throws Exception {
        read(vehiclesResource, row -> jdbc.update("""
            INSERT INTO public.vehicles(vehicle_id,registration,type,temp,temp_capability,weight_cap_kg,volume_cap_m3,
              fuel_type,km_per_l,weekly_fuel_quota_l,depot,brand,is_active)
            VALUES (?,?,?::public.vehicle_kind,?::public.vehicle_temp,
              CASE WHEN lower(?)='reefer' THEN 'CHILLED'::public.temp_requirement ELSE 'AMBIENT'::public.temp_requirement END,
              ?::numeric,?::numeric,?,?::numeric,?::numeric,?,?,true)
            ON CONFLICT (vehicle_id) DO NOTHING
            """, row.get("vehicle_id"), row.get("registration"), row.get("type"), row.get("temp"), row.get("temp"),
            row.get("weight_cap_kg"), row.get("volume_cap_m3"), row.get("fuel_type"), row.get("km_per_l"),
            row.get("weekly_fuel_quota_l"), row.get("depot"), row.get("brand")));
    }

    private void seedCalendar() throws Exception {
        read(calendarResource, row -> jdbc.update("""
            INSERT INTO public.calendar(date,dow,dow_name,is_weekend,iso_year,iso_week,is_payday,festival,
              festival_ramp,is_holiday,monsoon,is_operating)
            VALUES (?::date,?::smallint,?,?::boolean,?::smallint,?::smallint,?::boolean,NULLIF(?,''),
              ?::boolean,?::boolean,?::boolean,?::boolean)
            ON CONFLICT (date) DO NOTHING
            """, row.get("date"), row.get("dow"), row.get("dow_name"), row.get("is_weekend"), row.get("iso_year"),
            row.get("iso_week"), row.get("is_payday"), row.get("festival"), row.get("festival_ramp"),
            row.get("is_holiday"), row.get("monsoon"), row.get("is_operating")));
    }

    private void read(Resource resource, RowConsumer consumer) throws Exception {
        try (var reader = new CSVReaderHeaderAware(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            Map<String,String> row;
            while ((row = reader.readMap()) != null) consumer.accept(row);
        }
    }

    @FunctionalInterface private interface RowConsumer { void accept(Map<String,String> row) throws Exception; }
}
