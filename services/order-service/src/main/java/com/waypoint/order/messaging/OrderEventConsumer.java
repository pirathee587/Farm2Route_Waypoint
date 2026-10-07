package com.waypoint.order.messaging;

import com.waypoint.order.service.OrderEventHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class OrderEventConsumer {

    private final OrderEventHandler eventHandler;

    public OrderEventConsumer(OrderEventHandler eventHandler) {
        this.eventHandler = eventHandler;
    }

    @RabbitListener(
        queues = "${waypoint.rabbitmq.queues.allocation-completed}",
        ackMode = "AUTO")
    public void onAllocationCompleted(OrderEventPayload event) {
        if (event.orderId() != null) {
            eventHandler.handleAllocationCompleted(event);
            return;
        }
        if (event.orderIds() == null || event.orderIds().isEmpty()) {
            throw new IllegalArgumentException("Allocation event is missing order IDs");
        }
        event.orderIds().forEach(orderId -> eventHandler.handleAllocationCompleted(event.forOrder(orderId)));
    }

    @RabbitListener(
        queues = "${waypoint.rabbitmq.queues.order-deferred}",
        ackMode = "AUTO")
    public void onOrderDeferred(OrderEventPayload event) {
        eventHandler.handleOrderDeferred(event);
    }

    @RabbitListener(queues = "${waypoint.rabbitmq.queues.loading-completed}", ackMode = "AUTO")
    public void onLoadingCompleted(OrderEventPayload event) {
        eventHandler.handleLoadingCompleted(event);
    }

    @RabbitListener(
        queues = "${waypoint.rabbitmq.queues.delivery-completed}",
        ackMode = "AUTO")
    public void onDeliveryCompleted(OrderEventPayload event) {
        eventHandler.handleDeliveryCompleted(event);
    }
}
