package com.waypoint.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record OrderItemRequest(
    @NotBlank String item_name,
    @Min(1) int quantity,
    @NotBlank String unit
) {
}