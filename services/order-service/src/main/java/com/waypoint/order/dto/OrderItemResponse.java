package com.waypoint.order.dto;

import java.util.UUID;

public record OrderItemResponse(UUID id, String item_name, int quantity, String unit) {
}