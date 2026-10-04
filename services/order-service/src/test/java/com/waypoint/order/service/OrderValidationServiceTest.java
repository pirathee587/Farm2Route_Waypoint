package com.waypoint.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.waypoint.order.domain.OrderType;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class OrderValidationServiceTest {

    private static final Instant AT_THREE_PM = Instant.parse("2026-10-03T15:00:00Z");
    private static final Instant AT_FOUR_PM = Instant.parse("2026-10-03T16:00:00Z");

    @Test
    void allowsSameDayOrderBeforeCutoff() {
        var service = serviceAt(AT_THREE_PM);

        service.validateRequestedDate(java.time.LocalDate.of(2026, 10, 3));
    }

    @Test
    void rejectsSameDayOrderAtCutoff() {
        var service = serviceAt(AT_FOUR_PM);

        assertThatThrownBy(() -> service.validateRequestedDate(java.time.LocalDate.of(2026, 10, 3)))
            .isInstanceOf(OrderValidationException.class)
            .hasMessageContaining("4:00 PM cutoff");
    }

    @Test
    void rejectsPastDeliveryDate() {
        var service = serviceAt(AT_THREE_PM);

        assertThatThrownBy(() -> service.validateRequestedDate(java.time.LocalDate.of(2026, 10, 2)))
            .isInstanceOf(OrderValidationException.class)
            .hasMessageContaining("past");
    }

    @Test
    void requiresOrderTypeForFreshBrand() {
        var service = serviceAt(AT_THREE_PM);

        assertThatThrownBy(() -> service.parseOrderType("fresh", null))
            .isInstanceOf(OrderValidationException.class)
            .hasMessageContaining("required");
    }

    @Test
    void rejectsOrderTypeForNonFreshBrand() {
        var service = serviceAt(AT_THREE_PM);

        assertThatThrownBy(() -> service.parseOrderType("style", "dry"))
            .isInstanceOf(OrderValidationException.class)
            .hasMessageContaining("must be null");
    }

    @Test
    void parsesFreshOrderType() {
        var service = serviceAt(AT_THREE_PM);

        assertThat(service.parseOrderType("fresh", "chilled")).isEqualTo(OrderType.chilled);
    }

    private static OrderValidationService serviceAt(Instant instant) {
        return new OrderValidationService(Clock.fixed(instant, ZoneOffset.UTC));
    }
}