package com.waypoint.order.repository;

import com.waypoint.order.domain.ReceiptLineEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceiptLineRepository extends JpaRepository<ReceiptLineEntity, UUID> {}
