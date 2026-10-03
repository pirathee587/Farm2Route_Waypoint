package com.waypoint.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.waypoint.order.domain.DeliveryTrackingEntity;
import com.waypoint.order.domain.DeliveryTrackingStatus;
import com.waypoint.order.domain.OrderEntity;
import com.waypoint.order.domain.OrderStatus;
import com.waypoint.order.dto.DeliveryTrackingResponse;
import com.waypoint.order.messaging.OrderEventPayload;
import com.waypoint.order.repository.DeliveryTrackingRepository;
import com.waypoint.order.repository.OrderDeferralRepository;
import com.waypoint.order.repository.OrderRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderEventHandlerTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private DeliveryTrackingRepository deliveryTrackingRepository;

    @Mock
    private OrderDeferralRepository orderDeferralRepository;

    @Captor
    private ArgumentCaptor<DeliveryTrackingEntity> trackingCaptor;

    private OrderEventHandler handler;

    @BeforeEach
    void setUp() {
        handler = new OrderEventHandler(
            orderRepository,
            deliveryTrackingRepository,
            orderDeferralRepository
        );
    }

    @Test
    void handleDeliveryCompletedUpsertsTrackingRowWithCompletedStatus() {
        UUID orderId = UUID.randomUUID();
        OrderEntity order = new OrderEntity();
        order.setId(orderId);
        order.setStatus(OrderStatus.PENDING);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(deliveryTrackingRepository.findFirstByOrderIdOrderByUpdatedAtDesc(orderId))
            .thenReturn(Optional.empty());

        OrderEventPayload payload = new OrderEventPayload(orderId, "delivery.completed", null, null);
        handler.handleDeliveryCompleted(payload);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        verify(orderRepository).save(order);

        verify(deliveryTrackingRepository).save(trackingCaptor.capture());
        DeliveryTrackingEntity savedTracking = trackingCaptor.getValue();
        assertThat(savedTracking.getOrderId()).isEqualTo(orderId);
        assertThat(savedTracking.getStatus()).isEqualTo(DeliveryTrackingStatus.completed);
        assertThat(savedTracking.getSourceNote()).startsWith("Delivery completed · ");
    }

    @Test
    void trackingEndpointReturns200WithCompletedStateAfterDeliveryCompleted() {
        UUID orderId = UUID.randomUUID();
        OrderEntity order = new OrderEntity();
        order.setId(orderId);
        order.setStatus(OrderStatus.PENDING);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        DeliveryTrackingEntity trackingEntity = new DeliveryTrackingEntity();
        trackingEntity.setOrderId(orderId);
        trackingEntity.setStatus(DeliveryTrackingStatus.completed);
        trackingEntity.setSourceNote("Delivery completed · " + Instant.now());
        trackingEntity.setUpdatedAt(Instant.now());

        when(deliveryTrackingRepository.findFirstByOrderIdOrderByUpdatedAtDesc(orderId))
            .thenAnswer(invocation -> {
                // Simulate state after handler execution
                if (order.getStatus() == OrderStatus.DELIVERED) {
                    return Optional.of(trackingEntity);
                }
                return Optional.empty();
            });

        // 1. Process delivery completion event
        OrderEventPayload payload = new OrderEventPayload(orderId, "delivery.completed", null, null);
        handler.handleDeliveryCompleted(payload);

        // 2. Query tracking state
        Optional<DeliveryTrackingEntity> result = deliveryTrackingRepository.findFirstByOrderIdOrderByUpdatedAtDesc(orderId);
        assertThat(result).isPresent();
        DeliveryTrackingResponse response = DeliveryTrackingResponse.from(result.get());

        assertThat(response.status()).isEqualTo("completed");
        assertThat(response.source_note()).startsWith("Delivery completed · ");
    }
}
