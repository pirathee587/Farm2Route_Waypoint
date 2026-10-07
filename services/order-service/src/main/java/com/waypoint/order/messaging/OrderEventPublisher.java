package com.waypoint.order.messaging;

import com.waypoint.order.domain.OrderEntity;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class OrderEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final String routingKey;
    private final String pendingRoutingKey;

    public OrderEventPublisher(
        RabbitTemplate rabbitTemplate,
        @Value("${waypoint.rabbitmq.exchange}") String exchange,
        @Value("${waypoint.rabbitmq.routing-keys.order-placed}") String routingKey,
        @Value("${waypoint.rabbitmq.routing-keys.order-pending:order.pending}") String pendingRoutingKey) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.routingKey = routingKey;
        this.pendingRoutingKey = pendingRoutingKey;
    }

    public void publishOrderPending(OrderEntity order) {
        publish(order, pendingRoutingKey);
    }

    public void publishOrderPlaced(OrderEntity order) {
        publish(order, routingKey);
    }

    public void publishReceiptConfirmed(UUID orderId, UUID receiptId) {
        rabbitTemplate.convertAndSend(exchange, "order.receipt-confirmed",
            new StoreOrderEvent(orderId, "STORE_MANAGER", Instant.now(), Map.of("receipt_id", receiptId)));
    }

    public void publishFlagRaised(UUID orderId, UUID issueId, String issueType) {
        rabbitTemplate.convertAndSend(exchange, "flag.raised",
            new StoreOrderEvent(orderId, "STORE_MANAGER", Instant.now(),
                Map.of("issue_id", issueId, "issue_type", issueType)));
    }

    private void publish(OrderEntity order, String targetRoutingKey) {
        rabbitTemplate.convertAndSend(exchange, targetRoutingKey, new OrderPlacedEvent(
            order.getId(),
            order.getOutletId(),
            order.getBrand().name(),
            order.getOrderType() == null ? null : order.getOrderType().name(),
            order.getRequestedDeliveryDate(),
            order.getStatus().name(),
            order.getCreatedAt(),
            order.getItems().stream()
                .map(item -> new OrderPlacedEvent.OrderItemSummary(
                    item.getItemName(), item.getQuantity(), item.getUnit()))
                .toList()));
    }
}
