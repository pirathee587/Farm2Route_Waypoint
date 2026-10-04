package com.waypoint.order.service;

import com.waypoint.order.domain.Brand;
import com.waypoint.order.domain.OrderType;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.stereotype.Service;

@Service
public class OrderValidationService {

    private static final LocalTime SAME_DAY_CUTOFF = LocalTime.of(16, 0);
    private final Clock clock;

    public OrderValidationService() {
        this(Clock.systemDefaultZone());
    }

    OrderValidationService(Clock clock) {
        this.clock = clock;
    }

    public Brand parseBrand(String value) {
        try {
            return Brand.valueOf(value.trim().toLowerCase());
        } catch (RuntimeException exception) {
            throw new OrderValidationException("brand must be one of: fresh, style, tech");
        }
    }

    public OrderType parseOrderType(String brand, String value) {
        Brand parsedBrand = parseBrand(brand);
        if (parsedBrand == Brand.fresh && (value == null || value.isBlank())) {
            throw new OrderValidationException("order_type is required when brand is fresh");
        }
        if (parsedBrand != Brand.fresh && value != null) {
            throw new OrderValidationException("order_type must be null unless brand is fresh");
        }
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OrderType.valueOf(value.trim().toLowerCase());
        } catch (RuntimeException exception) {
            throw new OrderValidationException("order_type must be one of: dry, chilled");
        }
    }

    public void validateRequestedDate(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(clock);
        if (requestedDate.isBefore(today)) {
            throw new OrderValidationException("requested_delivery_date cannot be in the past");
        }
        if (requestedDate.equals(today) && !LocalTime.now(clock).isBefore(SAME_DAY_CUTOFF)) {
            throw new OrderValidationException(
                "same-day orders must be submitted before the 4:00 PM cutoff");
        }
    }
}