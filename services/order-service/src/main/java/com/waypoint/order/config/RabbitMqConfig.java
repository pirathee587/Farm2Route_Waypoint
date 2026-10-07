package com.waypoint.order.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;

@Configuration
public class RabbitMqConfig {

    @Bean
    TopicExchange waypointEventsExchange(
        @Value("${waypoint.rabbitmq.exchange}") String exchange) {
        return new TopicExchange(exchange, true, false);
    }

    @Bean
    Queue allocationCompletedQueue(
        @Value("${waypoint.rabbitmq.queues.allocation-completed}") String queue) {
        return new Queue(queue, true);
    }

    @Bean
    Queue orderDeferredQueue(
        @Value("${waypoint.rabbitmq.queues.order-deferred}") String queue) {
        return new Queue(queue, true);
    }

    @Bean
    Queue deliveryCompletedQueue(
        @Value("${waypoint.rabbitmq.queues.delivery-completed}") String queue) {
        return new Queue(queue, true);
    }

    @Bean
    Queue loadingCompletedQueue(@Value("${waypoint.rabbitmq.queues.loading-completed}") String queue) {
        return new Queue(queue, true);
    }

    @Bean
    Binding allocationCompletedBinding(
        @Qualifier("allocationCompletedQueue") Queue allocationCompletedQueue,
        TopicExchange waypointEventsExchange,
        @Value("${waypoint.rabbitmq.routing-keys.allocation-completed}") String routingKey) {
        return BindingBuilder.bind(allocationCompletedQueue)
            .to(waypointEventsExchange)
            .with(routingKey);
    }

    @Bean
    Binding orderDeferredBinding(
        @Qualifier("orderDeferredQueue") Queue orderDeferredQueue,
        TopicExchange waypointEventsExchange,
        @Value("${waypoint.rabbitmq.routing-keys.order-deferred}") String routingKey) {
        return BindingBuilder.bind(orderDeferredQueue)
            .to(waypointEventsExchange)
            .with(routingKey);
    }

    @Bean
    Binding deliveryCompletedBinding(
        @Qualifier("deliveryCompletedQueue") Queue deliveryCompletedQueue,
        TopicExchange waypointEventsExchange,
        @Value("${waypoint.rabbitmq.routing-keys.delivery-completed}") String routingKey) {
        return BindingBuilder.bind(deliveryCompletedQueue)
            .to(waypointEventsExchange)
            .with(routingKey);
    }

    @Bean
    Binding loadingCompletedBinding(
        @Qualifier("loadingCompletedQueue") Queue queue,
        TopicExchange exchange,
        @Value("${waypoint.rabbitmq.routing-keys.loading-completed}") String routingKey) {
        return BindingBuilder.bind(queue).to(exchange).with(routingKey);
    }

    @Bean
    MessageConverter rabbitMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
