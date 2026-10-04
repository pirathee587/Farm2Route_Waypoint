package com.waypoint.planning.repository;
import com.waypoint.planning.entity.TripStatus;import com.waypoint.planning.jpa.*;import org.springframework.stereotype.Repository;import java.time.*;import java.util.*;
/** JPA-backed planning query facade retained to keep constraint and dashboard callers small. */
@Repository public class PlanningRepository {
 private static final List<TripStatus> EXECUTABLE=List.of(TripStatus.CONFIRMED,TripStatus.READY_FOR_LOADING,TripStatus.PLANNED,TripStatus.LOADING,TripStatus.IN_PROGRESS,TripStatus.COMPLETED);
 private final TripJpaRepository trips;private final AllocationJpaRepository allocations;private final DeferralRecordJpaRepository deferrals;
 public PlanningRepository(TripJpaRepository trips,AllocationJpaRepository allocations,DeferralRecordJpaRepository deferrals){this.trips=trips;this.allocations=allocations;this.deferrals=deferrals;}
 public int tripCount(String vehicleId,LocalDate date){return Math.toIntExact(trips.countByVehicleIdAndPlanningDateAndStatusIn(vehicleId,date,EXECUTABLE));}
 public boolean orderAlreadyAllocated(UUID orderId,LocalDate date){return allocations.countAllocatedForDate(orderId,date)>0;}
 public List<UUID> allocatedOrderIds(LocalDate date){return allocations.findAllocatedOrderIds(date);}
 public List<UUID> deferredOrderIds(LocalDate date){return deferrals.findByDeliveryDateAndStatusOrderByCreatedAtDesc(date,"ACTIVE").stream().map(d->d.getOrderId()).distinct().toList();}
 public long countActiveTrips(LocalDate date){return trips.countByPlanningDateAndStatusIn(date,List.of(TripStatus.CONFIRMED,TripStatus.READY_FOR_LOADING,TripStatus.PLANNED,TripStatus.LOADING,TripStatus.IN_PROGRESS));}
}
