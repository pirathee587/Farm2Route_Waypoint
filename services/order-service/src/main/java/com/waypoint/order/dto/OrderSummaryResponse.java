package com.waypoint.order.dto;

import com.waypoint.order.domain.OrderEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record OrderSummaryResponse(
    UUID id,
    String brand,
    String order_type,
    LocalDate requested_delivery_date,
    String status,
    int item_count,
    String summary,
    Instant created_at
) {
    public static OrderSummaryResponse from(OrderEntity order) {
        String summary = order.getItems().stream()
            .limit(2)
            .map(item -> item.getItemName() + " x" + item.getQuantity())
            .collect(java.util.stream.Collectors.joining(", "));
        if (order.getItems().size() > 2) {
            summary += " + " + (order.getItems().size() - 2) + " more";
        }
        return new OrderSummaryResponse(
            order.getId(),
            order.getBrand().name(),
            order.getOrderType() == null ? null : order.getOrderType().name(),
            order.getRequestedDeliveryDate(),
            order.getStatus().name(),
            order.getItems().size(),
            summary,
            order.getCreatedAt());
    }
}