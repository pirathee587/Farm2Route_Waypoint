package com.waypoint.order.messaging;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderEventPayload(
    @JsonProperty("order_id") UUID orderId,
    @JsonProperty("orderIds") List<UUID> orderIds,
    @JsonProperty("reason") String reason,
    @JsonProperty("revised_date") LocalDate revisedDate,
    @JsonProperty("requested_delivery_date") LocalDate requestedDeliveryDate,
    @JsonProperty("eta") OffsetDateTime eta
) {
    public OrderEventPayload(UUID orderId, String reason, LocalDate revisedDate, LocalDate requestedDeliveryDate) {
        this(orderId, null, reason, revisedDate, requestedDeliveryDate, null);
    }

    public OrderEventPayload forOrder(UUID id) {
        return new OrderEventPayload(id, orderIds, reason, revisedDate, requestedDeliveryDate, eta);
    }
}
