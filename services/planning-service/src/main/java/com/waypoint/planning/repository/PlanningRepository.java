package com.waypoint.planning.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waypoint.planning.dto.PlanningModels.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class PlanningRepository {
  private final JdbcTemplate jdbc; private final ObjectMapper mapper;
  public PlanningRepository(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}

  public List<OrderInput> orders(LocalDate date){
    Instant cutoff=date.minusDays(1).atTime(16,0).atZone(ZoneId.of("Asia/Colombo")).toInstant();
    return jdbc.query("""
      SELECT o.order_id,o.outlet_id,o.product_code,o.quantity,o.weight_kg,o.volume_m3,o.brand,o.temp_requirement::text,o.preferred_date,o.window_open,o.window_close,o.order_value,o.closed_at,
       EXISTS(SELECT 1 FROM public.deferral_records d WHERE d.order_id=o.order_id AND d.delivery_date=(?::date - 1)) deferred_yesterday,
       GREATEST(0,(?::date)-COALESCE(x.last_served_date,(?::date - 30)))::int days_since,
       x.name,x.district,x.depot,x.parking_type::text,x.dock_type,x.mall_window_open,x.mall_window_close,x.store_manager_id
      FROM public.orders o JOIN public.outlets x ON x.outlet_id=o.outlet_id
      JOIN public.delivery_calendar c ON c.outlet_id=o.outlet_id AND c.delivery_date=? AND c.is_delivery_day=true
      WHERE o.preferred_date=? AND o.status::text IN ('PENDING','DEFERRED') AND o.closed_at IS NOT NULL AND o.closed_at<=?
      ORDER BY o.order_id
      """,(rs,n)->mapOrder(rs),date,date,date,date,date,Timestamp.from(cutoff));
  }
  private OrderInput mapOrder(ResultSet r)throws SQLException{
    UUID manager=r.getObject("store_manager_id",UUID.class);
    OutletInput outlet=new OutletInput(r.getString("outlet_id"),r.getString("name"),r.getString("district"),r.getString("depot"),r.getString("parking_type"),r.getString("dock_type"),r.getObject("mall_window_open",LocalTime.class),r.getObject("mall_window_close",LocalTime.class),manager);
    Timestamp closed=r.getTimestamp("closed_at");
    return new OrderInput(r.getObject("order_id",UUID.class),r.getString("outlet_id"),r.getString("product_code"),r.getInt("quantity"),r.getDouble("weight_kg"),r.getDouble("volume_m3"),r.getString("brand"),r.getString("temp_requirement"),r.getObject("preferred_date",LocalDate.class),r.getObject("window_open",LocalTime.class),r.getObject("window_close",LocalTime.class),r.getDouble("order_value"),closed.toInstant().atOffset(ZoneOffset.UTC),r.getBoolean("deferred_yesterday"),r.getInt("days_since"),outlet);
  }
  public List<VehicleInput> vehicles(){return jdbc.query("SELECT vehicle_id,registration,type::text,weight_cap_kg,volume_cap_m3,temp_capability::text,depot,brand,driver_id,km_per_l,weekly_fuel_quota_l,fuel_used_week_l,in_workshop FROM public.vehicles WHERE is_active=true",(r,n)->new VehicleInput(r.getString(1),r.getString(2),r.getString(3),r.getDouble(4),r.getDouble(5),r.getString(6),r.getString(7),r.getString(8),r.getObject(9,UUID.class),r.getDouble(10),r.getDouble(11),r.getDouble(12),r.getBoolean(13)));}
  public Map<String,TravelInput> travel(){Map<String,TravelInput>x=new HashMap<>();jdbc.query("SELECT depot,district,depot_to_district_freeflow_min,inter_stop_freeflow_min,distance_km FROM public.district_travel",r->{var v=new TravelInput(r.getString(1),r.getString(2),r.getInt(3),r.getInt(4),r.getDouble(5));x.put(v.depot()+"|"+v.district(),v);});return x;}
  public Map<String,Integer> allowances(){Map<String,Integer>x=new HashMap<>();jdbc.query("SELECT brand,dock_type,service_allowance_min FROM public.service_allowance",(org.springframework.jdbc.core.RowCallbackHandler)r->{x.put(r.getString(1)+"|"+r.getString(2),r.getInt(3));});return x;}
  public void saveDraft(LocalDate date,AllocationResult result,String user){try{jdbc.update("INSERT INTO public.planning_drafts(delivery_date,result,created_by) VALUES(?,?::jsonb,?) ON CONFLICT(delivery_date) DO UPDATE SET result=EXCLUDED.result,created_by=EXCLUDED.created_by,created_at=NOW()",date,mapper.writeValueAsString(result),user);}catch(JsonProcessingException e){throw new IllegalStateException(e);}}
  public AllocationResult draft(LocalDate date){String json=jdbc.queryForObject("SELECT result::text FROM public.planning_drafts WHERE delivery_date=?",String.class,date);try{return mapper.readValue(json,AllocationResult.class);}catch(JsonProcessingException e){throw new IllegalStateException(e);}}
  public List<DeferralHistory> deferrals(String outlet){return jdbc.query("SELECT d.order_id,o.outlet_id,d.delivery_date,d.reason,d.constraint_type::text,d.retry_date,d.created_at FROM public.deferral_records d JOIN public.orders o ON o.order_id=d.order_id WHERE (? IS NULL OR o.outlet_id=?) ORDER BY d.created_at DESC",(r,n)->new DeferralHistory(r.getObject(1,UUID.class),r.getString(2),r.getObject(3,LocalDate.class),r.getString(4),r.getString(5),r.getObject(6,LocalDate.class),r.getTimestamp(7).toInstant()),outlet,outlet);}
  public List<ProgressRow> progress(LocalDate date){return jdbc.query("""
    SELECT t.trip_id,t.vehicle_id,t.status::text,dr.outlet_id,COALESCE(dr.outcome::text,'PENDING'),dr.arrived_at,dr.departed_at
    FROM public.trips t LEFT JOIN public.delivery_records dr ON dr.trip_id=t.trip_id WHERE t.delivery_date=? ORDER BY t.vehicle_id,dr.created_at
    """,(r,n)->new ProgressRow(r.getObject(1,UUID.class),r.getString(2),r.getString(3),r.getString(4),r.getString(5),instant(r,6),instant(r,7)),date);}
  private Instant instant(ResultSet r,int i)throws SQLException{Timestamp t=r.getTimestamp(i);return t==null?null:t.toInstant();}

  @Transactional public PublishResponse publish(LocalDate date,AllocationResult result,String user){
    Integer rev=jdbc.queryForObject("""
      INSERT INTO public.planning_revisions(delivery_date,revision,updated_by) VALUES(?,1,?)
      ON CONFLICT(delivery_date) DO UPDATE SET revision=planning_revisions.revision+1,updated_by=EXCLUDED.updated_by,updated_at=NOW()
      RETURNING revision
      """,Integer.class,date,user);
    for(TripPlan t:result.servedTrips()){
      String[] sequence=t.stops().stream().map(StopPlan::outletId).toArray(String[]::new);
      jdbc.update("""
        INSERT INTO public.trips(trip_id,vehicle_id,driver_id,trip_number,delivery_date,status,stop_sequence,total_weight_kg,total_volume_m3,plan_revision,brand,district,trip_minutes,planned_start,destination_area)
        VALUES(?,?,?,?,?,'PLANNED',?,?,?,?,?,?,?,?,?) ON CONFLICT(trip_id) DO UPDATE SET stop_sequence=EXCLUDED.stop_sequence,total_weight_kg=EXCLUDED.total_weight_kg,total_volume_m3=EXCLUDED.total_volume_m3,plan_revision=EXCLUDED.plan_revision,trip_minutes=EXCLUDED.trip_minutes,updated_at=NOW()
        """,t.tripId(),t.vehicleId(),t.driverId(),t.tripNo(),date,sequence,t.loadKg(),t.loadVolumeM3(),rev,t.brand(),t.district(),t.tripMinutes(),Time.valueOf("06:00:00"),t.district());
      for(StopPlan s:t.stops())for(OrderInput o:s.orders()){
        jdbc.update("DELETE FROM public.allocations WHERE order_id=?",o.orderId());
        jdbc.update("INSERT INTO public.allocations(order_id,trip_id,vehicle_id,status,stop_index,planned_arrival,allocated_by) VALUES(?,?,?,'ALLOCATED',?,?,?)",o.orderId(),t.tripId(),t.vehicleId(),s.sequence(),Time.valueOf(s.eta()),user);
        jdbc.update("UPDATE public.orders SET status='ALLOCATED',updated_at=NOW() WHERE order_id=?",o.orderId());
      }
    }
    for(DeferredOrder d:result.deferred()){
      jdbc.update("INSERT INTO public.deferral_records(order_id,delivery_date,reason,constraint_type,retry_date) VALUES(?,?,?,?::public.constraint_type,?)",d.orderId(),date,d.message(),mapConstraint(d.reason()),d.newExpectedDate());
      jdbc.update("UPDATE public.orders SET status='DEFERRED',updated_at=NOW() WHERE order_id=?",d.orderId());
      insertOutbox("ORDER_DEFERRED","order.deferred",d.orderId().toString(),deferredPayload(d,result));
    }
    insertOutbox("ALLOCATION_COMPLETED","allocation.completed",date.toString(),allocationPayload(date,rev,user,result));
    return new PublishResponse(date,rev,result.servedTrips().size(),result.deferred().size());
  }
  private String mapConstraint(String r){return switch(r){case"REEFER_SHORTAGE"->"TEMP";case"VAN_ONLY"->"PARKING";case"CAPACITY"->"WEIGHT";case"TIME_BUDGET"->"TRIPS";case"FUEL_QUOTA"->"DEPOT";default->"WINDOW";};}
  private void insertOutbox(String type,String key,String id,Object payload){try{jdbc.update("INSERT INTO public.planning_outbox(event_type,routing_key,aggregate_id,payload) VALUES(?,?,?,?::jsonb)",type,key,id,mapper.writeValueAsString(payload));}catch(Exception e){throw new IllegalStateException(e);}}
  private Map<String,Object> allocationPayload(LocalDate date,int rev,String user,AllocationResult result){
    List<?> trips=result.servedTrips().stream().map(t->Map.of("trip_id",t.tripId(),"vehicle_id",t.vehicleId(),"driver_id",t.driverId(),"trip_no",t.tripNo(),"dock","Planning","stops",t.stops().stream().map(s->Map.of("stop_id",UUID.nameUUIDFromBytes((t.tripId()+"|"+s.outletId()).getBytes()),"sequence",s.sequence(),"outlet_id",s.outletId(),"outlet_name",s.outletName(),"district",s.district(),"bay_info",s.dockType(),"tag",s.dockType(),"orders",s.orders().stream().map(o->Map.of("order_id",o.orderId(),"items",List.of(Map.of("item_id",UUID.nameUUIDFromBytes((o.orderId()+"|"+o.productCode()).getBytes()),"sku",o.productCode(),"name",o.productCode(),"expected_qty",o.quantity(),"unit","units","weight_kg",o.weightKg(),"tags",List.of(o.tempRequirement().toLowerCase()))))).toList())).toList())).toList();
    return Map.of("date",date,"revision",rev,"updated_by",user,"trips",trips);
  }
  private Map<String,Object> deferredPayload(DeferredOrder d,AllocationResult result){
    String manager=jdbc.query("SELECT COALESCE(store_manager_id::text,'') FROM public.outlets WHERE outlet_id=?",rs->rs.next()?rs.getString(1):"",d.outletId());
    return Map.of("order_id",d.orderId(),"outlet_id",d.outletId(),"store_manager_user_id",manager,"reason",d.reason(),"new_expected_date",d.newExpectedDate());
  }
  public Map<String,Object> trip(UUID id){return jdbc.queryForMap("SELECT trip_id,vehicle_id,driver_id,trip_number,delivery_date,status::text,stop_sequence,total_weight_kg,total_volume_m3 FROM public.trips WHERE trip_id=?",id);}
}
