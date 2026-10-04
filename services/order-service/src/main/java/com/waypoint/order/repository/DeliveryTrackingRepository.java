package com.waypoint.order.repository;

import com.waypoint.order.domain.DeliveryTrackingEntity;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryTrackingRepository extends JpaRepository<DeliveryTrackingEntity, UUID> {

    List<DeliveryTrackingEntity> findByOrderIdOrderByUpdatedAtAsc(UUID orderId);

    Optional<DeliveryTrackingEntity> findFirstByOrderIdOrderByUpdatedAtDesc(UUID orderId);
}