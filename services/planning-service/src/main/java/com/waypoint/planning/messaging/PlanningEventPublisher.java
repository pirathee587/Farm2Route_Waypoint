package com.waypoint.planning.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.*;import java.util.*;

@Component
public class PlanningEventPublisher {
    private final RabbitTemplate rabbit; private final String exchange;
    public PlanningEventPublisher(RabbitTemplate rabbit,@Value("${waypoint.rabbitmq.exchange}")String exchange){this.rabbit=rabbit;this.exchange=exchange;}
    public void allocationCompleted(UUID tripId,String vehicleId,List<UUID> orderIds,LocalDate date){
        Map<String,Object> payload=Map.of("eventId",UUID.randomUUID().toString(),"eventType","ALLOCATION_COMPLETED","tripId",tripId.toString(),"vehicleId",vehicleId,"orderIds",orderIds.stream().map(UUID::toString).toList(),"deliveryDate",date.toString(),"status","CONFIRMED","occurredAt",Instant.now().toString());
        afterCommit(()->rabbit.convertAndSend(exchange,"allocation.completed",payload));
    }
    public void orderDeferred(UUID orderId,String reason,String constraint,LocalDate retry){
        Map<String,Object> payload=Map.of("eventId",UUID.randomUUID().toString(),"eventType","ORDER_DEFERRED","orderId",orderId.toString(),"reason",reason,"constraintType",constraint,"nextPlannedDate",retry.toString(),"occurredAt",Instant.now().toString());
        afterCommit(()->rabbit.convertAndSend(exchange,"order.deferred",payload));
    }
    private void afterCommit(Runnable action){if(!TransactionSynchronizationManager.isActualTransactionActive()){action.run();return;}TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){action.run();}});}
}
