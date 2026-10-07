package com.waypoint.planning.messaging;

import com.waypoint.planning.model.PlanningModels.OrderRef;
import com.waypoint.planning.model.PlanningModels.ValidationResult;
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
    /** Kept for source compatibility with older callers while they migrate to the manifest contract. */
    @Deprecated
    public void allocationCompleted(UUID tripId,String vehicleId,List<UUID> orderIds,LocalDate date){
        Map<String,Object> payload=Map.of("eventId",UUID.randomUUID().toString(),"eventType","ALLOCATION_COMPLETED","tripId",tripId.toString(),"vehicleId",vehicleId,"orderIds",orderIds.stream().map(UUID::toString).toList(),"deliveryDate",date.toString(),"status","CONFIRMED","occurredAt",Instant.now().toString());
        afterCommit(()->rabbit.convertAndSend(exchange,"allocation.completed",payload));
    }
    public void allocationCompleted(UUID tripId,String vehicleId,UUID driverId,Integer tripNo,LocalDate date,String updatedBy,List<OrderRef> orders,ValidationResult plan){
        Map<UUID,OrderRef> byId=new HashMap<>();orders.forEach(o->byId.put(o.orderId(),o));
        List<Map<String,Object>> eventStops=new ArrayList<>();
        for(var stop:plan.stops()){
            OrderRef order=byId.get(stop.orderId());
            if(order==null)continue;
            Map<String,Object> item=new LinkedHashMap<>();
            item.put("sku",Objects.toString(order.productCode(),"ITEM"));item.put("name",Objects.toString(order.productCode(),"Order item"));
            item.put("expected_qty",order.quantity());item.put("unit","units");item.put("weight_kg",order.weightKg());
            item.put("tags",order.tempRequirement()==null?List.of():List.of(order.tempRequirement()));
            Map<String,Object> eventOrder=new LinkedHashMap<>();eventOrder.put("order_id",order.orderId().toString());eventOrder.put("items",List.of(item));
            Map<String,Object> eventStop=new LinkedHashMap<>();eventStop.put("sequence",stop.sequence());eventStop.put("outlet_id",order.outletId());
            eventStop.put("outlet_name",order.outletName());eventStop.put("district",Objects.toString(order.district(),""));
            eventStop.put("bay_info","");eventStop.put("tag",Objects.toString(order.tempRequirement(),""));eventStop.put("orders",List.of(eventOrder));
            eventStops.add(eventStop);
        }
        Map<String,Object> eventTrip=new LinkedHashMap<>();eventTrip.put("trip_id",tripId.toString());eventTrip.put("vehicle_id",vehicleId);
        eventTrip.put("driver_id",driverId==null?"":driverId.toString());eventTrip.put("trip_no",tripNo==null?0:tripNo);eventTrip.put("dock","");eventTrip.put("stops",eventStops);
        Map<String,Object> payload=new LinkedHashMap<>();payload.put("event_id",UUID.randomUUID().toString());payload.put("event_type","ALLOCATION_COMPLETED");
        payload.put("date",date.toString());payload.put("revision",1);payload.put("updated_by",Objects.toString(updatedBy,"dispatcher"));payload.put("trips",List.of(eventTrip));payload.put("occurred_at",Instant.now().toString());
        afterCommit(()->rabbit.convertAndSend(exchange,"allocation.completed",payload));
    }
    public void orderDeferred(UUID orderId,String reason,String constraint,LocalDate retry){
        Map<String,Object> payload=Map.of("eventId",UUID.randomUUID().toString(),"eventType","ORDER_DEFERRED","orderId",orderId.toString(),"reason",reason,"constraintType",constraint,"nextPlannedDate",retry.toString(),"occurredAt",Instant.now().toString());
        afterCommit(()->rabbit.convertAndSend(exchange,"order.deferred",payload));
    }
    private void afterCommit(Runnable action){if(!TransactionSynchronizationManager.isActualTransactionActive()){action.run();return;}TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){action.run();}});}
}
