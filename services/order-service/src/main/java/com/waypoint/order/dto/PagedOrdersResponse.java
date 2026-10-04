package com.waypoint.order.dto;

import java.util.List;

public record PagedOrdersResponse(
    List<OrderSummaryResponse> items,
    int page,
    int size,
    long total_elements,
    int total_pages
) {
}