package com.waypoint.order.dto;

import java.time.Instant;
import java.util.UUID;

public record ReceiptResponse(
    UUID id,
    UUID order_id,
    String confirmed_by,
    Instant confirmed_at,
    boolean has_discrepancy
) {
}