package com.waypoint.order.repository;

import com.waypoint.order.domain.ReceiptConfirmationEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceiptConfirmationRepository extends JpaRepository<ReceiptConfirmationEntity, UUID> {

    boolean existsByOrderId(UUID orderId);
}