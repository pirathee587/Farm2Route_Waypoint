package com.waypoint.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CreateReceiptRequest(
    @NotBlank String confirmed_by,
    boolean has_discrepancy,
    List<ReceiptLine> items
) {
    public record ReceiptLine(@NotNull UUID order_item_id, @Min(0) int received_qty) {}
}
