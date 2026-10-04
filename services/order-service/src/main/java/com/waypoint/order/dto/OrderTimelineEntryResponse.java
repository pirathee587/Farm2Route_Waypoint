package com.waypoint.order.dto;

import java.time.Instant;

public record OrderTimelineEntryResponse(
    String event,
    String status,
    Instant occurred_at,
    String note
) {
}