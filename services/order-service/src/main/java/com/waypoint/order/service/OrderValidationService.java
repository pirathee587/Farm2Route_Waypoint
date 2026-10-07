package com.waypoint.order.service;

import com.waypoint.order.domain.Brand;
import com.waypoint.order.domain.OrderType;
import com.waypoint.order.repository.OrderRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

@Service
public class OrderValidationService {

    private static final LocalTime SAME_DAY_CUTOFF = LocalTime.of(16, 0);
    private static final ZoneId COLOMBO_ZONE = ZoneId.of("Asia/Colombo");
    private final Clock clock;
    private final OrderRepository orders;

    @Autowired
    public OrderValidationService(OrderRepository orders) {
        this(Clock.system(COLOMBO_ZONE), orders);
    }

    OrderValidationService(Clock clock) {
        this(clock, null);
    }

    OrderValidationService(Clock clock, OrderRepository orders) {
        this.clock = clock;
        this.orders = orders;
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
        Clock colomboClock = clock.withZone(COLOMBO_ZONE);
        LocalDate today = LocalDate.now(colomboClock);
        LocalTime now = LocalTime.now(colomboClock);
        LocalDate cutoffDay = requestedDate.minusDays(1);
        if (today.isEqual(cutoffDay) && !now.isBefore(SAME_DAY_CUTOFF)) {
            throw new CutoffPassedException("Order cutoff for " + requestedDate + " passed at 16:00 Asia/Colombo. Submit for " + requestedDate.plusDays(1) + " or a later run.");
        }
        if (today.isAfter(cutoffDay)) {
            throw new CutoffPassedException("Cannot place order for " + requestedDate + ". Cutoff date has passed.");
        }
    }

    public void validateBrandSchedule(String outletId, LocalDate orderDate, Brand brand, OrderType orderType) {
        if (brand == Brand.tech) return;
        if (brand == Brand.fresh) {
            long freshOrders = orders.countByOutletIdAndRequestedDeliveryDateAndBrand(outletId, orderDate, Brand.fresh);
            if (freshOrders >= 2) {
                throw new OrderValidationException("Fresh outlet " + outletId + " already has 2 orders for " + orderDate + " (maximum 1 dry + 1 chilled per day).");
            }
            long sameType = orders.countByOutletIdAndRequestedDeliveryDateAndBrandAndOrderType(outletId, orderDate, Brand.fresh, orderType);
            if (sameType >= 1) {
                throw new OrderValidationException("Fresh outlet already has a " + orderType.name() + " order for this date.");
            }
            return;
        }
        LocalDate weekStart = orderDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        if (orders.countByOutletIdAndBrandAndRequestedDeliveryDateBetween(outletId, Brand.style, weekStart, weekEnd) > 0) {
            throw new OrderValidationException("Style outlet can only place one order per week.");
        }
    }
}
