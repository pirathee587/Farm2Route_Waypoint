package com.waypoint.order.repository;

import com.waypoint.order.domain.OrderEntity;
import com.waypoint.order.domain.OrderStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID>, JpaSpecificationExecutor<OrderEntity> {

    List<OrderEntity> findByRequestedDeliveryDateAndStatusIn(
        LocalDate requestedDeliveryDate,
        List<OrderStatus> statuses);

    @Override
    @EntityGraph(attributePaths = "items")
    Page<OrderEntity> findAll(Specification<OrderEntity> specification, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "items")
    Optional<OrderEntity> findById(UUID id);
}