package com.waypoint.order.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateReceiptRequest(
    @NotBlank String confirmed_by,
    boolean has_discrepancy
) {
}