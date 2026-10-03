package com.waypoint.order.messaging;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OrderPlacedEvent(
    UUID order_id,
    String outlet_id,
    String brand,
    String order_type,
    LocalDate requested_delivery_date,
    String status,
    Instant created_at,
    List<OrderItemSummary> items
) {
    public record OrderItemSummary(String item_name, int quantity, String unit) {
    }
}