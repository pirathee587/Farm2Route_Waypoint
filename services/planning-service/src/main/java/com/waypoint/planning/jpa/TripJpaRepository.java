package com.waypoint.planning.jpa;
import com.waypoint.planning.entity.*;import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import jakarta.persistence.LockModeType;import java.time.*;import java.util.*;
public interface TripJpaRepository extends JpaRepository<TripEntity,UUID>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from TripEntity t where t.id=:id") Optional<TripEntity> findByIdForUpdate(@Param("id")UUID id);
 long countByVehicleIdAndPlanningDateAndStatusIn(String vehicleId,LocalDate date,Collection<TripStatus> statuses);
 long countByPlanningDateAndStatusIn(LocalDate date,Collection<TripStatus> statuses);
 List<TripEntity> findByPlanningDateAndStatusInOrderByTripCode(LocalDate date,Collection<TripStatus> statuses);
}
