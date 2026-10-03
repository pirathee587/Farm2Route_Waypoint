package com.waypoint.planning.service;
import com.waypoint.planning.dto.PlanningModels.*;import org.springframework.stereotype.Component;import java.util.*;
@Component public class AllocationValidator {
  private final AllocationEngine engine;public AllocationValidator(AllocationEngine engine){this.engine=engine;}
  public List<String> checkAllocation(AllocationResult result,List<VehicleInput> fleet,Map<String,TravelInput> travel,Map<String,Integer> allowances){Map<String,VehicleInput> byId=new HashMap<>();fleet.forEach(v->byId.put(v.vehicleId(),v));List<String> violations=new ArrayList<>();Map<String,Long> counts=result.servedTrips().stream().collect(java.util.stream.Collectors.groupingBy(TripPlan::vehicleId,java.util.stream.Collectors.counting()));counts.forEach((id,count)->{if(count>2)violations.add(id+":MAX_TWO_TRIPS");});for(TripPlan trip:result.servedTrips())for(String v:engine.validateTrip(trip,byId,travel,allowances))violations.add(trip.tripId()+":"+v);Set<UUID> seen=new HashSet<>();for(TripPlan t:result.servedTrips())for(StopPlan s:t.stops())for(OrderInput o:s.orders())if(!seen.add(o.orderId()))violations.add(o.orderId()+":ORDER_SPLIT_OR_DUPLICATED");return violations;}
}
