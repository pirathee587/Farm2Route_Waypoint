package com.waypoint.planning.constraint;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.PlanningRepository;
import com.waypoint.planning.routing.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;

@Component
public class ConstraintEngine {
    private final PlanningRepository planning;
    private final List<ConstraintValidator> validators;
    private final RouteTimingProvider timing;
    public ConstraintEngine(PlanningRepository planning,List<ConstraintValidator> validators){this(planning,validators,new DeterministicWindowTimingProvider());}
    @Autowired public ConstraintEngine(PlanningRepository planning,List<ConstraintValidator> validators,RouteTimingProvider timing){this.planning=planning;this.validators=List.copyOf(validators);this.timing=timing;}

    public ValidationResult validate(List<OrderRef> orders,VehicleRef vehicle,LocalDate date,List<UUID> requestedSequence){
        if(orders==null||orders.isEmpty()) throw new IllegalArgumentException("At least one order is required");
        List<StopPlan> stops=timing.planArrivals(sequence(orders,requestedSequence));
        boolean duplicate=orders.stream().anyMatch(o->planning.orderAlreadyAllocated(o.orderId(),date));
        PlanningRepository.FuelProjection fuel=planning.fuelProjection(vehicle.vehicleId(),date,orders.getFirst().district(),stops.size());
        if(fuel==null)fuel=PlanningRepository.FuelProjection.unavailable();
        PlanningContext context=new PlanningContext(List.copyOf(orders),vehicle,date,stops,planning.tripCount(vehicle.vehicleId(),date),duplicate,
                fuel.currentWeekFuelL(),fuel.plannedFuelL(),fuel.available());
        List<ConstraintCheck> checks=validators.stream().map(v->v.validate(context)).toList();
        boolean feasible=checks.stream().noneMatch(c->c.blocking()&&"FAILED".equals(c.status()));
        return new ValidationResult(feasible,context.totalWeight(),context.totalVolume(),checks,stops);
    }

    private List<OrderRef> sequence(List<OrderRef> orders,List<UUID> ids){
        if(ids==null||ids.isEmpty())return orders.stream().sorted(Comparator.comparing(OrderRef::windowClose,Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(o->o.orderId().toString())).toList();
        if(new HashSet<>(ids).size()!=ids.size())throw new IllegalArgumentException("Stop order contains duplicates");
        Map<UUID,OrderRef> remaining=new LinkedHashMap<>();orders.forEach(o->remaining.put(o.orderId(),o));
        List<OrderRef> result=new ArrayList<>();for(UUID id:ids){OrderRef o=remaining.remove(id);if(o==null)throw new IllegalArgumentException("Stop order contains an order outside the trip: "+id);result.add(o);}result.addAll(remaining.values());return result;
    }
}
