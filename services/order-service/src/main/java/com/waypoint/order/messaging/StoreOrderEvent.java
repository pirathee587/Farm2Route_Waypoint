package com.waypoint.order.messaging;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;

public record StoreOrderEvent(
    @JsonProperty("order_id") UUID orderId,
    String source,
    @JsonProperty("occurred_at") Instant occurredAt,
    Object details
) {}
