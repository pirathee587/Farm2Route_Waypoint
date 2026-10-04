package com.waypoint.order.dto;

import com.waypoint.order.domain.OrderDeferralEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record OrderDeferralResponse(
    UUID id,
    String reason,
    LocalDate original_date,
    LocalDate revised_date,
    boolean is_repeat_deferral,
    Instant created_at
) {
    public static OrderDeferralResponse from(OrderDeferralEntity deferral) {
        return new OrderDeferralResponse(
            deferral.getId(),
            deferral.getReason(),
            deferral.getOriginalDate(),
            deferral.getRevisedDate(),
            deferral.isRepeatDeferral(),
            deferral.getCreatedAt());
    }
}