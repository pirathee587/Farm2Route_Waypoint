package com.waypoint.order.service;

import com.waypoint.order.domain.DeliveryTrackingEntity;
import com.waypoint.order.domain.DeliveryTrackingStatus;
import com.waypoint.order.domain.OrderDeferralEntity;
import com.waypoint.order.domain.OrderEntity;
import com.waypoint.order.domain.OrderStatus;
import com.waypoint.order.messaging.OrderEventPayload;
import com.waypoint.order.repository.DeliveryTrackingRepository;
import com.waypoint.order.repository.OrderDeferralRepository;
import com.waypoint.order.repository.OrderRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderEventHandler {

    private static final Duration RECENT_DEFERRAL_WINDOW = Duration.ofDays(30);

    private final OrderRepository orderRepository;
    private final DeliveryTrackingRepository deliveryTrackingRepository;
    private final OrderDeferralRepository orderDeferralRepository;

    public OrderEventHandler(
        OrderRepository orderRepository,
        DeliveryTrackingRepository deliveryTrackingRepository,
        OrderDeferralRepository orderDeferralRepository) {
        this.orderRepository = orderRepository;
        this.deliveryTrackingRepository = deliveryTrackingRepository;
        this.orderDeferralRepository = orderDeferralRepository;
    }

    @Transactional
    public void handleAllocationCompleted(OrderEventPayload event) {
        var order = findOrder(event);
        order.setStatus(OrderStatus.ALLOCATED);
        orderRepository.save(order);

        var tracking = deliveryTrackingRepository
            .findFirstByOrderIdOrderByUpdatedAtDesc(order.getId())
            .orElseGet(DeliveryTrackingEntity::new);
        tracking.setOrderId(order.getId());
        tracking.setStatus(DeliveryTrackingStatus.allocated);
        tracking.setEta(event.eta());
        tracking.setSourceNote("Dispatch plan - updated " + Instant.now());
        deliveryTrackingRepository.save(tracking);
    }

    @Transactional
    public void handleLoadingCompleted(OrderEventPayload event) {
        var order = findOrder(event);
        var tracking = deliveryTrackingRepository
            .findFirstByOrderIdOrderByUpdatedAtDesc(order.getId())
            .orElseGet(DeliveryTrackingEntity::new);
        tracking.setOrderId(order.getId());
        tracking.setStatus(DeliveryTrackingStatus.loaded);
        tracking.setSourceNote("Loading completed · " + Instant.now());
        deliveryTrackingRepository.save(tracking);
    }

    @Transactional
    public void handleOrderDeferred(OrderEventPayload event) {
        var order = findOrder(event);
        order.setStatus(OrderStatus.DEFERRED);
        orderRepository.save(order);

        var deferral = new OrderDeferralEntity();
        deferral.setOrderId(order.getId());
        deferral.setReason(event.reason() == null || event.reason().isBlank()
            ? "Order deferred by planning service"
            : event.reason());
        deferral.setOriginalDate(order.getRequestedDeliveryDate());
        deferral.setRevisedDate(event.revisedDate());
        deferral.setRepeatDeferral(orderDeferralRepository.existsRecentForOutlet(
            order.getOutletId(), Instant.now().minus(RECENT_DEFERRAL_WINDOW)));
        orderDeferralRepository.save(deferral);
    }

    @Transactional
    public void handleDeliveryCompleted(OrderEventPayload event) {
        var order = findOrder(event);
        order.setStatus(OrderStatus.DELIVERED);
        orderRepository.save(order);

        var tracking = deliveryTrackingRepository
            .findFirstByOrderIdOrderByUpdatedAtDesc(order.getId())
            .orElseGet(DeliveryTrackingEntity::new);
        tracking.setOrderId(order.getId());
        tracking.setStatus(DeliveryTrackingStatus.completed);
        tracking.setSourceNote("Delivery completed · " + Instant.now());
        deliveryTrackingRepository.save(tracking);
    }

    private OrderEntity findOrder(OrderEventPayload event) {
        UUID orderId = event.orderId();
        if (orderId == null) {
            throw new IllegalArgumentException("Order event is missing order_id");
        }
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order event references unknown order: " + orderId));
    }
}
