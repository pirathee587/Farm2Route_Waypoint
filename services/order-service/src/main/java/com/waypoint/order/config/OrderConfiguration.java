package com.waypoint.order.config;
import org.springframework.amqp.core.*;import org.springframework.context.annotation.*;import java.time.*;
@Configuration public class OrderConfiguration {
 @Bean Clock clock(){return Clock.system(ZoneId.of("Asia/Colombo"));}
 @Bean TopicExchange events(){return new TopicExchange("waypoint.events",true,false);}
 @Bean Queue orderEventsQueue(){return QueueBuilder.durable("order.lifecycle").withArgument("x-dead-letter-exchange","waypoint.events.dlx").build();}
 @Bean Declarables bindings(Queue orderEventsQueue,TopicExchange events){return new Declarables(
  BindingBuilder.bind(orderEventsQueue).to(events).with("allocation.completed"),BindingBuilder.bind(orderEventsQueue).to(events).with("order.deferred"),
  BindingBuilder.bind(orderEventsQueue).to(events).with("loading.completed"),BindingBuilder.bind(orderEventsQueue).to(events).with("delivery.completed"));}
}
