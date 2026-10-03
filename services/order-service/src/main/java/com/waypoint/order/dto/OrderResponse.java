package com.waypoint.order.dto;

import com.waypoint.order.domain.OrderEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    String outlet_id,
    String brand,
    String order_type,
    LocalDate requested_delivery_date,
    String status,
    String created_by_user_id,
    Instant created_at,
    Instant updated_at,
    List<OrderItemResponse> items
) {
    public static OrderResponse from(OrderEntity order) {
        return new OrderResponse(
            order.getId(),
            order.getOutletId(),
            order.getBrand().name(),
            order.getOrderType() == null ? null : order.getOrderType().name(),
            order.getRequestedDeliveryDate(),
            order.getStatus().name(),
            order.getCreatedByUserId(),
            order.getCreatedAt(),
            order.getUpdatedAt(),
            order.getItems().stream()
                .map(item -> new OrderItemResponse(
                    item.getId(), item.getItemName(), item.getQuantity(), item.getUnit()))
                .toList());
    }
}