package com.waypoint.order.messaging;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.UUID;

public record OrderEventPayload(
    @JsonProperty("order_id") UUID orderId,
    @JsonProperty("reason") String reason,
    @JsonProperty("revised_date") LocalDate revisedDate,
    @JsonProperty("requested_delivery_date") LocalDate requestedDeliveryDate
) {
}