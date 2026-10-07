package com.waypoint.order.service;

import com.waypoint.order.domain.OrderStatus;
import com.waypoint.order.messaging.OrderEventPublisher;
import com.waypoint.order.repository.OrderRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderConsolidationScheduler {
    private static final ZoneId COLOMBO_ZONE = ZoneId.of("Asia/Colombo");
    private final OrderRepository orders;
    private final OrderEventPublisher events;
    private final Clock clock;

    @Autowired
    public OrderConsolidationScheduler(OrderRepository orders, OrderEventPublisher events) {
        this(orders, events, Clock.system(COLOMBO_ZONE));
    }

    OrderConsolidationScheduler(OrderRepository orders, OrderEventPublisher events, Clock clock) {
        this.orders = orders;
        this.events = events;
        this.clock = clock;
    }

    @Scheduled(cron = "0 0 16 * * MON-SAT", zone = "Asia/Colombo")
    @Transactional
    public void consolidateOrdersAtCutoff() {
        LocalDate deliveryDate = LocalDate.now(clock.withZone(COLOMBO_ZONE)).plusDays(1);
        var pending = orders.findByRequestedDeliveryDateAndStatus(deliveryDate, OrderStatus.PENDING);
        for (var order : pending) {
            order.setStatus(OrderStatus.CONFIRMED);
            order.setConfirmedAt(Instant.now(clock));
            orders.save(order);
            events.publishOrderPlaced(order);
        }
    }
}
