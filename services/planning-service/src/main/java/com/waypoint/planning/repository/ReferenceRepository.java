package com.waypoint.planning.repository;

import com.waypoint.planning.exception.PlanningException;
import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.port.PlanningMasterDataPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class ReferenceRepository implements PlanningMasterDataPort {
    private final JdbcTemplate jdbc;
    public ReferenceRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private OrderRef mapOrder(ResultSet rs, int n) throws SQLException {
        return new OrderRef(UUID.fromString(rs.getString("order_id")), rs.getString("outlet_id"), rs.getString("outlet_name"),
                rs.getString("district"), rs.getString("depot"), rs.getString("parking_type"), nullableDouble(rs,"lat"),
                nullableDouble(rs,"lng"), rs.getString("product_code"), rs.getInt("quantity"), rs.getDouble("weight_kg"),
                rs.getDouble("volume_m3"), rs.getString("brand"), rs.getString("temp_requirement"),
                rs.getObject("preferred_date", LocalDate.class), rs.getObject("window_open", LocalTime.class),
                rs.getObject("window_close", LocalTime.class), rs.getString("order_status"));
    }

    private Double nullableDouble(ResultSet rs,String col) throws SQLException { double v=rs.getDouble(col); return rs.wasNull()?null:v; }

    public OrderRef getOrder(UUID id) {
        var l = jdbc.query("""
            SELECT o.id AS order_id,o.outlet_id,x.name outlet_name,x.district,x.depot,x.parking_type,
                   x.lat::double precision lat,x.lng::double precision lng,COALESCE(o.product_code,items.product_code) product_code,COALESCE(o.quantity,items.quantity,0) quantity,
                   o.weight_kg::double precision weight_kg,o.volume_m3::double precision volume_m3,
                   o.brand,COALESCE(o.temp_requirement::text,CASE WHEN o.order_type::text='chilled' THEN 'CHILLED' ELSE 'AMBIENT' END) temp_requirement,COALESCE(o.preferred_date,o.requested_delivery_date) preferred_date,o.window_open,o.window_close,
                   o.status::text order_status
            FROM public.orders o JOIN public.outlets x ON x.outlet_id=o.outlet_id
            LEFT JOIN LATERAL (SELECT string_agg(oi.item_name,', ' ORDER BY oi.item_name) product_code,SUM(oi.quantity)::int quantity FROM public.order_items oi WHERE oi.order_id=o.id) items ON true
            WHERE o.id=?
            """, this::mapOrder, id);
        if(l.isEmpty()) throw new PlanningException(404,"Order not found: "+id);
        return l.getFirst();
    }

    public List<OrderRef> getOrders(Collection<UUID> ids) {
        if(ids==null || ids.isEmpty()) return List.of();
        return ids.stream().map(this::getOrder).toList();
    }

    public List<OrderRef> listPlanningOrders(LocalDate date) {
        return jdbc.query("""
            SELECT o.id AS order_id,o.outlet_id,x.name outlet_name,x.district,x.depot,x.parking_type,
                   x.lat::double precision lat,x.lng::double precision lng,COALESCE(o.product_code,items.product_code) product_code,COALESCE(o.quantity,items.quantity,0) quantity,
                   o.weight_kg::double precision weight_kg,o.volume_m3::double precision volume_m3,
                   o.brand,COALESCE(o.temp_requirement::text,CASE WHEN o.order_type::text='chilled' THEN 'CHILLED' ELSE 'AMBIENT' END) temp_requirement,COALESCE(o.preferred_date,o.requested_delivery_date) preferred_date,o.window_open,o.window_close,
                   o.status::text order_status
            FROM public.orders o JOIN public.outlets x ON x.outlet_id=o.outlet_id
            LEFT JOIN LATERAL (SELECT string_agg(oi.item_name,', ' ORDER BY oi.item_name) product_code,SUM(oi.quantity)::int quantity FROM public.order_items oi WHERE oi.order_id=o.id) items ON true
            WHERE COALESCE(o.preferred_date,o.requested_delivery_date)=? ORDER BY o.window_close NULLS LAST,o.created_at
            """, this::mapOrder, date);
    }

    private VehicleRef mapVehicle(ResultSet rs,int n) throws SQLException {
        String driver=rs.getString("driver_id");
        return new VehicleRef(rs.getString("vehicle_id"),rs.getString("registration"),rs.getString("type"),
                rs.getDouble("weight_cap_kg"),rs.getDouble("volume_cap_m3"),rs.getString("temp_capability"),
                rs.getString("depot"),rs.getString("brand"),driver==null?null:UUID.fromString(driver),rs.getBoolean("is_active"),
                rs.getBoolean("available"),rs.getDouble("weekly_fuel_quota_l"),rs.getDouble("weekly_fuel_used_l"));
    }

    public VehicleRef getVehicle(String id) {
        var l=jdbc.query("""
            SELECT v.vehicle_id,v.registration,v.type::text type,v.weight_cap_kg::double precision weight_cap_kg,
                   v.volume_cap_m3::double precision volume_cap_m3,v.temp_capability::text temp_capability,v.depot,v.brand,
                   v.driver_id,v.is_active,COALESCE(s.available,true) available,
                   COALESCE(s.weekly_fuel_quota_l,0)::double precision weekly_fuel_quota_l,
                   COALESCE(s.weekly_fuel_used_l,0)::double precision weekly_fuel_used_l
            FROM public.vehicles v LEFT JOIN public.vehicle_planning_state s ON s.vehicle_id=v.vehicle_id
            WHERE v.vehicle_id=?
            """,this::mapVehicle,id);
        if(l.isEmpty()) throw new PlanningException(404,"Vehicle not found: "+id);
        return l.getFirst();
    }

    public List<VehicleRef> listVehicles() {
        return jdbc.query("""
            SELECT v.vehicle_id,v.registration,v.type::text type,v.weight_cap_kg::double precision weight_cap_kg,
                   v.volume_cap_m3::double precision volume_cap_m3,v.temp_capability::text temp_capability,v.depot,v.brand,
                   v.driver_id,v.is_active,COALESCE(s.available,true) available,
                   COALESCE(s.weekly_fuel_quota_l,0)::double precision weekly_fuel_quota_l,
                   COALESCE(s.weekly_fuel_used_l,0)::double precision weekly_fuel_used_l
            FROM public.vehicles v LEFT JOIN public.vehicle_planning_state s ON s.vehicle_id=v.vehicle_id
            WHERE v.is_active=true ORDER BY v.vehicle_id
            """,this::mapVehicle);
    }
}
