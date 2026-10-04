package com.waypoint.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record CreateOrderRequest(
    @NotBlank String brand,
    String order_type,
    @NotNull LocalDate requested_delivery_date,
    @NotEmpty @Valid List<OrderItemRequest> items
) {
}