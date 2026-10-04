package com.waypoint.planning.jpa;
import com.waypoint.planning.entity.TripStopEntity;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface TripStopJpaRepository extends JpaRepository<TripStopEntity,UUID>{List<TripStopEntity> findByTripIdOrderBySequence(UUID tripId);Optional<TripStopEntity> findByTripIdAndOrderId(UUID tripId,UUID orderId);void deleteByTripIdAndOrderId(UUID tripId,UUID orderId);void deleteByTripId(UUID tripId);}
