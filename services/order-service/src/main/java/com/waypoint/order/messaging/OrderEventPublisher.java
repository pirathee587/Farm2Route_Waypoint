package com.waypoint.order.messaging;

import com.waypoint.order.domain.OrderEntity;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OrderEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final String routingKey;

    public OrderEventPublisher(
        RabbitTemplate rabbitTemplate,
        @Value("${waypoint.rabbitmq.exchange}") String exchange,
        @Value("${waypoint.rabbitmq.routing-keys.order-placed}") String routingKey) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.routingKey = routingKey;
    }

    public void publishOrderPlaced(OrderEntity order) {
        rabbitTemplate.convertAndSend(exchange, routingKey, new OrderPlacedEvent(
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