package com.waypoint.planning.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class OperationsReadService {
    private final JdbcTemplate jdbc;
    public OperationsReadService(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public List<Map<String,Object>> fleet(LocalDate date){
        return jdbc.query("""
            SELECT v.vehicle_id,v.registration,v.type::text vehicle_type,v.temp_capability::text temp_capability,
                   v.weight_cap_kg::double precision weight_cap_kg,v.volume_cap_m3::double precision volume_cap_m3,
                   v.depot,v.driver_id::text,COALESCE(s.available,true) available,
                   COALESCE(s.weekly_fuel_quota_l,v.weekly_fuel_quota_l,0)::double precision fuel_quota,
                   COALESCE(s.weekly_fuel_used_l,0)::double precision fuel_used,
                   COUNT(t.trip_id) FILTER (WHERE t.status::text<>'CANCELLED')::int trips_today,
                   BOOL_OR(t.status::text IN ('LOADING','IN_PROGRESS')) in_use
            FROM public.vehicles v
            LEFT JOIN public.vehicle_planning_state s ON s.vehicle_id=v.vehicle_id
            LEFT JOIN public.trips t ON t.vehicle_id=v.vehicle_id AND t.delivery_date=?
            WHERE v.is_active=true
            GROUP BY v.vehicle_id,v.registration,v.type,v.temp_capability,v.weight_cap_kg,v.volume_cap_m3,
                     v.depot,v.driver_id,s.available,s.weekly_fuel_quota_l,v.weekly_fuel_quota_l,s.weekly_fuel_used_l
            ORDER BY v.vehicle_id
            """,(rs,n)->{
                Map<String,Object> row=new LinkedHashMap<>();
                row.put("id",rs.getString("vehicle_id"));row.put("registration",rs.getString("registration"));
                row.put("vehicleType",rs.getString("vehicle_type"));row.put("tempCapability",rs.getString("temp_capability"));
                row.put("weightCapacityKg",rs.getDouble("weight_cap_kg"));row.put("volumeCapacityM3",rs.getDouble("volume_cap_m3"));
                row.put("depot",rs.getString("depot"));row.put("driverId",rs.getString("driver_id"));
                row.put("available",rs.getBoolean("available"));row.put("inUse",rs.getBoolean("in_use"));
                row.put("tripsToday",rs.getInt("trips_today"));row.put("fuelQuota",rs.getDouble("fuel_quota"));row.put("fuelUsed",rs.getDouble("fuel_used"));
                return row;
            },date);
    }

    public List<Map<String,Object>> tracking(LocalDate date){
        var trips=jdbc.query("""
            SELECT t.trip_id,t.trip_code,t.status::text status,t.vehicle_id,t.trip_number,t.home_depot,
                   COALESCE(t.destination_area,'') destination_area,t.total_weight_kg::double precision total_weight,
                   t.total_volume_m3::double precision total_volume,t.departed_at,t.completed_at,
                   v.registration,v.type::text vehicle_type,v.temp_capability::text temp_capability,
                   v.weight_cap_kg::double precision weight_cap,v.volume_cap_m3::double precision volume_cap,
                   v.driver_id::text driver_id
            FROM public.trips t JOIN public.vehicles v ON v.vehicle_id=t.vehicle_id
            WHERE t.delivery_date=? AND t.status::text IN ('CONFIRMED','READY_FOR_LOADING','PLANNED','LOADING','IN_PROGRESS','COMPLETED')
            ORDER BY t.trip_number,t.trip_code
            """,(rs,n)->{
                Map<String,Object> row=new LinkedHashMap<>();UUID id=rs.getObject("trip_id",UUID.class);
                row.put("tripId",id);row.put("tripCode",Optional.ofNullable(rs.getString("trip_code")).orElse(id.toString().substring(0,8)));
                row.put("status",rs.getString("status"));row.put("vehicleId",rs.getString("vehicle_id"));row.put("tripNumber",rs.getInt("trip_number"));
                row.put("homeDepot",rs.getString("home_depot"));row.put("destination",rs.getString("destination_area"));
                row.put("weightKg",rs.getDouble("total_weight"));row.put("volumeM3",rs.getDouble("total_volume"));
                row.put("departedAt",rs.getObject("departed_at"));row.put("completedAt",rs.getObject("completed_at"));
                row.put("registration",rs.getString("registration"));row.put("vehicleType",rs.getString("vehicle_type"));
                row.put("tempCapability",rs.getString("temp_capability"));row.put("maxWeightKg",rs.getDouble("weight_cap"));row.put("maxVolumeM3",rs.getDouble("volume_cap"));
                row.put("driverId",rs.getString("driver_id"));row.put("stops",stops(id));return row;
            },date);
        return trips;
    }

    public List<Map<String,Object>> forecast(LocalDate from,int weeks){
        LocalDate until=from.plusWeeks(Math.max(1,Math.min(weeks,26)));
        return jdbc.query("""
            SELECT date_trunc('week',COALESCE(o.preferred_date,o.requested_delivery_date))::date week_start,
                   x.depot,o.brand::text brand,COUNT(*)::int order_count,
                   COALESCE(SUM(o.volume_m3),0)::double precision total_volume_m3,
                   COALESCE(SUM(CASE WHEN COALESCE(o.temp_requirement::text,o.order_type::text) ILIKE '%chill%' THEN o.volume_m3 ELSE 0 END),0)::double precision chilled_volume_m3
            FROM public.orders o JOIN public.outlets x ON x.outlet_id=o.outlet_id
            WHERE COALESCE(o.preferred_date,o.requested_delivery_date)>=? AND COALESCE(o.preferred_date,o.requested_delivery_date)<?
            GROUP BY week_start,x.depot,o.brand ORDER BY week_start,x.depot,o.brand
            """,(rs,n)->Map.of("weekStart",rs.getObject("week_start",LocalDate.class),"depot",rs.getString("depot"),"brand",rs.getString("brand"),"orderCount",rs.getInt("order_count"),"totalVolumeM3",rs.getDouble("total_volume_m3"),"chilledVolumeM3",rs.getDouble("chilled_volume_m3")),from,until);
    }

    private List<Map<String,Object>> stops(UUID tripId){
        return jdbc.query("""
            SELECT s.trip_stop_id,s.stop_sequence,s.order_id,s.outlet_id,x.name outlet_name,x.district,
                   s.planned_arrival,s.delivery_window_start,s.delivery_window_end,
                   COALESCE(d.outcome::text,'PENDING') delivery_status,
                   COALESCE(o.temp_requirement::text,CASE WHEN o.order_type::text='chilled' THEN 'CHILLED' ELSE 'AMBIENT' END) temp_requirement
            FROM public.trip_stops s JOIN public.outlets x ON x.outlet_id=s.outlet_id
            LEFT JOIN public.orders o ON o.id=s.order_id
            LEFT JOIN public.delivery_records d ON d.trip_id=s.trip_id AND d.outlet_id=s.outlet_id
            WHERE s.trip_id=? ORDER BY s.stop_sequence
            """,(rs,n)->{
                Map<String,Object> row=new LinkedHashMap<>();row.put("id",rs.getObject("trip_stop_id"));row.put("sequence",rs.getInt("stop_sequence"));
                row.put("orderId",rs.getObject("order_id"));row.put("outletId",rs.getString("outlet_id"));row.put("name",rs.getString("outlet_name"));row.put("district",rs.getString("district"));
                row.put("plannedArrival",rs.getObject("planned_arrival"));row.put("windowOpen",rs.getObject("delivery_window_start"));row.put("windowClose",rs.getObject("delivery_window_end"));
                row.put("status",rs.getString("delivery_status"));row.put("temperature",rs.getString("temp_requirement"));return row;
            },tripId);
    }
}
