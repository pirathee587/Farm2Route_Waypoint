package com.waypoint.planning.repository;
import com.waypoint.planning.entity.TripStatus;import com.waypoint.planning.jpa.*;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Repository;import java.time.*;import java.time.temporal.TemporalAdjusters;import java.util.*;
/** JPA-backed planning query facade retained to keep constraint and dashboard callers small. */
@Repository public class PlanningRepository {
 private static final List<TripStatus> EXECUTABLE=List.of(TripStatus.CONFIRMED,TripStatus.READY_FOR_LOADING,TripStatus.PLANNED,TripStatus.LOADING,TripStatus.IN_PROGRESS,TripStatus.COMPLETED);
 private final TripJpaRepository trips;private final AllocationJpaRepository allocations;private final DeferralRecordJpaRepository deferrals;private final JdbcTemplate jdbc;
 public PlanningRepository(TripJpaRepository trips,AllocationJpaRepository allocations,DeferralRecordJpaRepository deferrals,JdbcTemplate jdbc){this.trips=trips;this.allocations=allocations;this.deferrals=deferrals;this.jdbc=jdbc;}
 public int tripCount(String vehicleId,LocalDate date){return Math.toIntExact(trips.countByVehicleIdAndPlanningDateAndStatusNot(vehicleId,date,TripStatus.CANCELLED));}
 public boolean orderAlreadyAllocated(UUID orderId,LocalDate date){return allocations.countAllocatedForDate(orderId,date)>0;}
 public List<UUID> allocatedOrderIds(LocalDate date){return allocations.findAllocatedOrderIds(date);}
 public List<UUID> activeOrderIds(LocalDate date){return allocations.findActiveOrderIds(date);}
 public List<UUID> deferredOrderIds(LocalDate date){return deferrals.findByDeliveryDateAndStatusOrderByCreatedAtDesc(date,"ACTIVE").stream().map(d->d.getOrderId()).distinct().toList();}
 public long countActiveTrips(LocalDate date){return trips.countByPlanningDateAndStatusIn(date,List.of(TripStatus.CONFIRMED,TripStatus.READY_FOR_LOADING,TripStatus.PLANNED,TripStatus.LOADING,TripStatus.IN_PROGRESS));}
 public FuelProjection fuelProjection(String vehicleId,LocalDate date,String district,int stopCount){
  if(district==null||stopCount<1)return FuelProjection.unavailable();
  List<Double> efficiencies=jdbc.query("SELECT km_per_l::double precision FROM public.vehicles WHERE vehicle_id=? AND km_per_l>0",(rs,n)->rs.getDouble(1),vehicleId);
  List<double[]> travel=jdbc.query("SELECT depot_to_district_km::double precision,inter_stop_km::double precision FROM public.district_travel WHERE district=? AND depot=(SELECT depot FROM public.vehicles WHERE vehicle_id=?)",(rs,n)->new double[]{rs.getDouble(1),rs.getDouble(2)},district,vehicleId);
  if(efficiencies.isEmpty()||travel.isEmpty())return FuelProjection.unavailable();
  LocalDate weekStart=date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));LocalDate weekEnd=weekStart.plusDays(6);
  Double used=jdbc.queryForObject("SELECT COALESCE(SUM(fuel_consumed_l),0)::double precision FROM public.trips WHERE vehicle_id=? AND delivery_date BETWEEN ? AND ? AND status <> 'CANCELLED'",Double.class,vehicleId,weekStart,weekEnd);
  double distance=travel.getFirst()[0]+travel.getFirst()[1]*Math.max(0,stopCount-1);
  return new FuelProjection(used==null?0:used,distance/efficiencies.getFirst(),true);
 }
 public record FuelProjection(double currentWeekFuelL,double plannedFuelL,boolean available){public static FuelProjection unavailable(){return new FuelProjection(0,0,false);}}
}
