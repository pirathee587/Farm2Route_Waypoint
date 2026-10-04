package com.waypoint.order.dto;

import com.waypoint.order.domain.DeliveryTrackingEntity;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DeliveryTrackingResponse(
    UUID id,
    String status,
    OffsetDateTime eta,
    boolean is_delayed,
    String source_note,
    Instant updated_at
) {
    public static DeliveryTrackingResponse from(DeliveryTrackingEntity tracking) {
        return new DeliveryTrackingResponse(
            tracking.getId(),
            tracking.getStatus().name(),
            tracking.getEta(),
            tracking.isDelayed(),
            tracking.getSourceNote(),
            tracking.getUpdatedAt());
    }
}