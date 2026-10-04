package com.waypoint.planning.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waypoint.planning.exception.PlanningException;
import com.waypoint.planning.model.PlanningModels.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class PlanningRepository {
    private final JdbcTemplate jdbc; private final ObjectMapper json;
    public PlanningRepository(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}

    public int tripCount(String vehicleId, LocalDate date) {
        Integer n=jdbc.queryForObject("SELECT count(*) FROM public.trips WHERE vehicle_id=? AND delivery_date=? AND status::text <> 'CANCELLED'",Integer.class,vehicleId,date);
        return n==null?0:n;
    }
    public boolean orderAlreadyAllocated(UUID orderId, LocalDate date) {
        Integer n=jdbc.queryForObject("""
            SELECT count(*) FROM public.allocations a JOIN public.trips t ON t.trip_id=a.trip_id
            WHERE a.order_id=? AND t.delivery_date=? AND a.status::text='ALLOCATED' AND t.status::text<>'CANCELLED'
            """,Integer.class,orderId,date);
        return n!=null && n>0;
    }
    public UUID createTrip(String vehicleId, UUID driverId, int tripNumber, LocalDate date, double weight, double volume, List<String> stopOutletIds) {
        return jdbc.queryForObject("""
            INSERT INTO public.trips(vehicle_id,driver_id,trip_number,delivery_date,status,stop_sequence,total_weight_kg,total_volume_m3)
            VALUES (?,?,?,?,'PLANNED'::public.trip_status,string_to_array(?, ','),?,?) RETURNING trip_id
            """,UUID.class,vehicleId,driverId,tripNumber,date,String.join(",",stopOutletIds),weight,volume);
    }
    public void createAllocation(UUID orderId, UUID tripId, String vehicleId, int stopIndex, LocalTime arrival, String allocatedBy) {
        jdbc.update("""
            INSERT INTO public.allocations(order_id,trip_id,vehicle_id,status,stop_index,planned_arrival,allocated_by)
            VALUES (?,?,?,'ALLOCATED'::public.allocation_status,?,?,?)
            """,orderId,tripId,vehicleId,stopIndex,arrival,allocatedBy==null?"SYSTEM":allocatedBy);
    }
    public UUID defer(UUID orderId, LocalDate deliveryDate, String reason, String constraintType, LocalDate retryDate, String by) {
        jdbc.update("DELETE FROM public.allocations WHERE order_id=? AND status::text='DEFERRED'",orderId);
        jdbc.update("""
            INSERT INTO public.allocations(order_id,status,deferral_reason,failed_constraint,retry_date,allocated_by)
            VALUES (?,'DEFERRED'::public.allocation_status,?,CAST(? AS public.constraint_type),?,?)
            """,orderId,reason,constraintType,retryDate,by==null?"SYSTEM":by);
        return jdbc.queryForObject("""
            INSERT INTO public.deferral_records(order_id,delivery_date,reason,constraint_type,retry_date)
            VALUES (?,?,?,CAST(? AS public.constraint_type),?) RETURNING deferral_id
            """,UUID.class,orderId,deliveryDate,reason,constraintType,retryDate);
    }
    public void returnToPlanning(UUID orderId) {
        jdbc.update("DELETE FROM public.allocations WHERE order_id=? AND status::text='DEFERRED'",orderId);
    }
    public List<DeferralView> listDeferrals(LocalDate date) {
        return jdbc.query("""
            SELECT deferral_id,order_id,delivery_date,reason,constraint_type::text constraint_type,retry_date,notified,created_at
            FROM public.deferral_records d WHERE delivery_date=? AND EXISTS (SELECT 1 FROM public.allocations a WHERE a.order_id=d.order_id AND a.status::text='DEFERRED') ORDER BY created_at DESC
            """,(rs,n)->new DeferralView(UUID.fromString(rs.getString("deferral_id")),UUID.fromString(rs.getString("order_id")),
                rs.getObject("delivery_date",LocalDate.class),rs.getString("reason"),rs.getString("constraint_type"),
                rs.getObject("retry_date",LocalDate.class),rs.getBoolean("notified"),rs.getTimestamp("created_at").toInstant()),date);
    }
    public List<UUID> allocatedOrderIds(LocalDate date) {
        return jdbc.query("""
            SELECT a.order_id FROM public.allocations a JOIN public.trips t ON t.trip_id=a.trip_id
            WHERE t.delivery_date=? AND a.status::text='ALLOCATED' AND t.status::text<>'CANCELLED'
            """,(rs,n)->UUID.fromString(rs.getString(1)),date);
    }
    public List<UUID> deferredOrderIds(LocalDate date) {
        return jdbc.query("SELECT DISTINCT a.order_id FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.status::text=\'DEFERRED\' AND o.preferred_date=?",(rs,n)->UUID.fromString(rs.getString(1)),date);
    }
    public long countTrips(LocalDate date,String status) {
        Long n=jdbc.queryForObject("SELECT count(*) FROM public.trips WHERE delivery_date=? AND status::text=?",Long.class,date,status); return n==null?0:n;
    }
    public long countVehiclesUsed(LocalDate date) {
        Long n=jdbc.queryForObject("SELECT count(DISTINCT vehicle_id) FROM public.trips WHERE delivery_date=? AND status::text<>'CANCELLED'",Long.class,date);return n==null?0:n;
    }
    public void saveDraft(UUID id, TripDraftRequest req, String userId) {
        try {
            jdbc.update("""
                INSERT INTO public.planning_drafts(draft_id,delivery_date,vehicle_id,order_ids,stop_order_ids,created_by,updated_at)
                VALUES (?,?,?,CAST(? AS jsonb),CAST(? AS jsonb),?,NOW())
                ON CONFLICT(draft_id) DO UPDATE SET delivery_date=EXCLUDED.delivery_date,vehicle_id=EXCLUDED.vehicle_id,
                order_ids=EXCLUDED.order_ids,stop_order_ids=EXCLUDED.stop_order_ids,updated_at=NOW()
                """,id,req.deliveryDate(),req.vehicleId(),json.writeValueAsString(req.orderIds()),json.writeValueAsString(req.stopOrderIds()),userId);
        } catch(JsonProcessingException e){throw new PlanningException(500,"Could not serialize draft");}
    }
}
