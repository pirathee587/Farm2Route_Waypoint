package com.waypoint.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.waypoint.order.domain.OrderType;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import com.waypoint.order.domain.Brand;
import com.waypoint.order.repository.OrderRepository;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrderValidationServiceTest {

    private static final Instant AT_THREE_PM = Instant.parse("2026-10-03T09:30:00Z");
    private static final Instant AT_FOUR_PM = Instant.parse("2026-10-03T10:30:00Z");

    @Test
    void allowsNextDayOrderBeforeCutoff() {
        var service = serviceAt(AT_THREE_PM);

        service.validateRequestedDate(java.time.LocalDate.of(2026, 10, 4));
    }

    @Test
    void rejectsNextDayOrderAtCutoff() {
        var service = serviceAt(AT_FOUR_PM);

        assertThatThrownBy(() -> service.validateRequestedDate(java.time.LocalDate.of(2026, 10, 4)))
            .isInstanceOf(CutoffPassedException.class)
            .hasMessageContaining("16:00 Asia/Colombo")
            .hasMessageContaining("Submit for 2026-10-05");
    }

    @Test
    void rejectsPastDeliveryDate() {
        var service = serviceAt(AT_THREE_PM);

        assertThatThrownBy(() -> service.validateRequestedDate(java.time.LocalDate.of(2026, 10, 2)))
            .isInstanceOf(OrderValidationException.class)
            .hasMessageContaining("Cutoff date has passed");
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

    @Test
    void rejectsSecondFreshOrderOfSameType() {
        OrderRepository orders = mock(OrderRepository.class);
        var date = java.time.LocalDate.of(2026, 10, 5);
        when(orders.countByOutletIdAndRequestedDeliveryDateAndBrandAndOrderType("OUT1", date, Brand.fresh, OrderType.chilled)).thenReturn(1L);
        var service = new OrderValidationService(Clock.fixed(AT_THREE_PM, ZoneOffset.UTC), orders);
        assertThatThrownBy(() -> service.validateBrandSchedule("OUT1", date, Brand.fresh, OrderType.chilled))
            .isInstanceOf(OrderValidationException.class).hasMessageContaining("chilled order");
    }

    @Test
    void rejectsSecondStyleOrderInIsoWeek() {
        OrderRepository orders = mock(OrderRepository.class);
        var date = java.time.LocalDate.of(2026, 10, 8);
        when(orders.countByOutletIdAndBrandAndRequestedDeliveryDateBetween("OUT1", Brand.style,
            java.time.LocalDate.of(2026, 10, 5), java.time.LocalDate.of(2026, 10, 11))).thenReturn(1L);
        var service = new OrderValidationService(Clock.fixed(AT_THREE_PM, ZoneOffset.UTC), orders);
        assertThatThrownBy(() -> service.validateBrandSchedule("OUT1", date, Brand.style, null))
            .isInstanceOf(OrderValidationException.class).hasMessageContaining("one order per week");
    }

    private static OrderValidationService serviceAt(Instant instant) {
        return new OrderValidationService(Clock.fixed(instant, ZoneOffset.UTC));
    }
}
