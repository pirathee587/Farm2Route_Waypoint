package com.waypoint.planning.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.*;import java.util.*;

@Component
public class PlanningEventPublisher {
    private final RabbitTemplate rabbit; private final String exchange;
    public PlanningEventPublisher(RabbitTemplate rabbit,@Value("${waypoint.rabbitmq.exchange}")String exchange){this.rabbit=rabbit;this.exchange=exchange;}
    public void allocationCompleted(UUID tripId,String vehicleId,List<UUID> orderIds,LocalDate date){
        rabbit.convertAndSend(exchange,"allocation.completed",Map.of("eventType","ALLOCATION_COMPLETED","tripId",tripId.toString(),"vehicleId",vehicleId,"orderIds",orderIds.stream().map(UUID::toString).toList(),"deliveryDate",date.toString(),"occurredAt",Instant.now().toString()));
    }
    public void orderDeferred(UUID orderId,String reason,String constraint,LocalDate retry){
        rabbit.convertAndSend(exchange,"order.deferred",Map.of("eventType","ORDER_DEFERRED","orderId",orderId.toString(),"reason",reason,"constraintType",constraint,"retryDate",retry.toString(),"occurredAt",Instant.now().toString()));
    }
}
