package com.waypoint.order.repository;

import com.waypoint.order.domain.OrderEntity;
import com.waypoint.order.domain.OrderStatus;
import com.waypoint.order.domain.Brand;
import com.waypoint.order.domain.OrderType;
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

    @EntityGraph(attributePaths = "items")
    List<OrderEntity> findByRequestedDeliveryDateAndStatusIn(
        LocalDate requestedDeliveryDate,
        List<OrderStatus> statuses);

    @EntityGraph(attributePaths = "items")
    List<OrderEntity> findByRequestedDeliveryDateAndStatus(
        LocalDate requestedDeliveryDate,
        OrderStatus status);

    @Override
    @EntityGraph(attributePaths = "items")
    Page<OrderEntity> findAll(Specification<OrderEntity> specification, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "items")
    Optional<OrderEntity> findById(UUID id);

    long countByOutletIdAndRequestedDeliveryDateAndBrand(
        String outletId, LocalDate requestedDeliveryDate, Brand brand);

    long countByOutletIdAndRequestedDeliveryDateAndBrandAndOrderType(
        String outletId, LocalDate requestedDeliveryDate, Brand brand, OrderType orderType);

    long countByOutletIdAndBrandAndRequestedDeliveryDateBetween(
        String outletId, Brand brand, LocalDate weekStart, LocalDate weekEnd);
}
