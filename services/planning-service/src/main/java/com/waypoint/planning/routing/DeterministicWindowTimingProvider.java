package com.waypoint.planning.routing;
import com.waypoint.planning.model.PlanningModels.*;import org.springframework.stereotype.Component;import java.time.*;import java.util.*;
@Component
public class DeterministicWindowTimingProvider implements RouteTimingProvider {
 private final Duration serviceInterval;
 public DeterministicWindowTimingProvider(){this(Duration.ofMinutes(40));}
 DeterministicWindowTimingProvider(Duration serviceInterval){this.serviceInterval=serviceInterval;}
 public List<StopPlan> planArrivals(List<OrderRef> sequence){List<StopPlan> result=new ArrayList<>();LocalTime cursor=sequence.isEmpty()?null:sequence.getFirst().windowOpen();for(int i=0;i<sequence.size();i++){OrderRef order=sequence.get(i);if(cursor==null||cursor.isBefore(order.windowOpen()))cursor=order.windowOpen();result.add(new StopPlan(i+1,order.orderId(),order.outletId(),order.outletName(),cursor,order.windowOpen(),order.windowClose(),order.weightKg(),order.volumeM3()));cursor=cursor.plus(serviceInterval);}return List.copyOf(result);}
}
