package com.waypoint.order.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EtaResponse(UUID order_id, OffsetDateTime expected_arrival_time, boolean delayed) {}
