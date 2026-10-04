package com.waypoint.planning.jpa;
import com.waypoint.planning.entity.*;import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;
public interface AllocationJpaRepository extends JpaRepository<AllocationEntity,UUID>{
 List<AllocationEntity> findByTripIdOrderByStopIndex(UUID tripId);Optional<AllocationEntity> findByTripIdAndOrderId(UUID tripId,UUID orderId);void deleteByTripIdAndOrderId(UUID tripId,UUID orderId);
 @Query("select a from AllocationEntity a where a.orderId=:orderId and a.status in :statuses") Optional<AllocationEntity> findActiveByOrderId(@Param("orderId")UUID orderId,@Param("statuses")Collection<AllocationStatus> statuses);
 Optional<AllocationEntity> findFirstByOrderIdAndStatusOrderByIdDesc(UUID orderId,AllocationStatus status);
 @Query(value="select count(*) from public.allocations a join public.trips t on t.trip_id=a.trip_id where a.order_id=:orderId and a.status='ALLOCATED'::public.allocation_status and t.delivery_date=:date and t.status<>'CANCELLED'::public.trip_status",nativeQuery=true) long countAllocatedForDate(@Param("orderId")UUID orderId,@Param("date")java.time.LocalDate date);
 @Query(value="select a.order_id from public.allocations a join public.trips t on t.trip_id=a.trip_id where a.status='ALLOCATED'::public.allocation_status and t.delivery_date=:date and t.status<>'CANCELLED'::public.trip_status",nativeQuery=true) List<UUID> findAllocatedOrderIds(@Param("date")java.time.LocalDate date);
}
