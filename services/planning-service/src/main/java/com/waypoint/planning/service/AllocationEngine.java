package com.waypoint.planning.service;

import com.waypoint.planning.dto.PlanningModels.*;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AllocationEngine {
  public static final Set<String> REASONS = Set.of("CAPACITY", "REEFER_SHORTAGE", "VAN_ONLY", "TIME_BUDGET", "WINDOW", "FUEL_QUOTA");

  public AllocationResult allocate(LocalDate date, List<OrderInput> sourceOrders,
      List<VehicleInput> sourceVehicles, Map<String, TravelInput> travel,
      Map<String, Integer> allowances) {
    List<OrderInput> orders = sourceOrders.stream().sorted(priorityComparator()).toList();
    List<VehicleInput> vehicles = sourceVehicles.stream()
        .filter(v -> !v.inWorkshop()).sorted(Comparator.comparing(VehicleInput::vehicleId)).toList();
    Map<String,List<MutableTrip>> byVehicle = new LinkedHashMap<>();
    Map<String,Integer> freshMinutes = new HashMap<>(), otherMinutes = new HashMap<>();
    Map<String,Double> fuelUsed = new HashMap<>();
    List<DeferredOrder> deferred = new ArrayList<>();

    for (OrderInput order : orders) {
      Assignment assignment = findAssignment(date, order, vehicles, byVehicle, travel, allowances,
          freshMinutes, otherMinutes, fuelUsed);
      if (assignment.trip != null) {
        assignment.trip.add(order, assignment.metrics);
        String vehicle = assignment.trip.vehicle.vehicleId();
        recomputeVehicleUsage(vehicle, byVehicle, freshMinutes, otherMinutes, fuelUsed);
      } else {
        String suffix = order.deferredYesterday() ? " It remained infeasible despite deferred-yesterday priority." : "";
        deferred.add(new DeferredOrder(order.orderId(), order.outletId(), assignment.reason,
            humanReason(assignment.reason) + suffix, date.plusDays(1)));
      }
    }
    List<TripPlan> trips = byVehicle.values().stream().flatMap(Collection::stream)
        .sorted(Comparator.comparing((MutableTrip t)->t.vehicle.vehicleId()).thenComparingInt(t->t.tripNo))
        .map(t -> t.freeze(date)).toList();
    return new AllocationResult(date, trips, List.copyOf(deferred));
  }

  private Assignment findAssignment(LocalDate date, OrderInput order, List<VehicleInput> vehicles,
      Map<String,List<MutableTrip>> byVehicle, Map<String,TravelInput> travel,
      Map<String,Integer> allowances, Map<String,Integer> freshMinutes,
      Map<String,Integer> otherMinutes, Map<String,Double> fuelUsed) {
    LinkedHashSet<String> failures = new LinkedHashSet<>();
    for (VehicleInput vehicle : vehicles) {
      String structural = structuralFailure(order, vehicle);
      if (structural != null) { failures.add(structural); continue; }
      List<MutableTrip> trips = byVehicle.computeIfAbsent(vehicle.vehicleId(), ignored -> new ArrayList<>());
      for (MutableTrip trip : trips) {
        if (!trip.brand.equals(order.brand()) || !trip.district.equals(order.outlet().district())) continue;
        Metrics metrics = metrics(trip.ordersWith(order), vehicle, travel, allowances);
        String failure = operationalFailure(order, vehicle, metrics, freshMinutes, otherMinutes, fuelUsed, trip.minutes, trip.distanceKm);
        if (failure == null) return new Assignment(trip, metrics, null);
        failures.add(failure);
      }
      if (trips.size() < 2) {
        MutableTrip candidate = new MutableTrip(vehicle, trips.size()+1, order.brand(), order.outlet().district());
        Metrics metrics = metrics(List.of(order), vehicle, travel, allowances);
        String failure = operationalFailure(order, vehicle, metrics, freshMinutes, otherMinutes, fuelUsed, 0, 0);
        if (failure == null) { trips.add(candidate); return new Assignment(candidate, metrics, null); }
        failures.add(failure);
      } else failures.add("TIME_BUDGET");
    }
    return new Assignment(null, null, chooseReason(failures));
  }

  private String structuralFailure(OrderInput o, VehicleInput v) {
    if (!Objects.equals(o.outlet().depot(), v.depot())) return "CAPACITY";
    if (!(v.brand().equalsIgnoreCase(o.brand()) || v.brand().equalsIgnoreCase("ALL"))) return "CAPACITY";
    if (o.outlet().dockType().equalsIgnoreCase("VAN_ONLY") && !v.type().equalsIgnoreCase("VAN")) return "VAN_ONLY";
    if (o.tempRequirement().equalsIgnoreCase("CHILLED") && !(v.tempCapability().equalsIgnoreCase("CHILLED") || v.tempCapability().equalsIgnoreCase("REEFER"))) return "REEFER_SHORTAGE";
    return null;
  }

  private String operationalFailure(OrderInput o, VehicleInput v, Metrics m,
      Map<String,Integer> freshMinutes, Map<String,Integer> otherMinutes,
      Map<String,Double> fuelUsed, int oldMinutes, double oldDistance) {
    if (m.weight > v.weightCapKg() || m.volume > v.volumeCapM3()) return "CAPACITY";
    int delta = m.minutes-oldMinutes;
    int used = o.brand().equalsIgnoreCase("Fresh") ? freshMinutes.getOrDefault(v.vehicleId(),0) : otherMinutes.getOrDefault(v.vehicleId(),0);
    int budget = o.brand().equalsIgnoreCase("Fresh") ? 270 : 480;
    if (used+delta > budget) return "TIME_BUDGET";
    if (!m.windowsValid) return "WINDOW";
    double extraLitres = Math.max(0,m.distanceKm-oldDistance)/Math.max(.1,v.kmPerL());
    double remaining = v.weeklyFuelQuotaL()-v.fuelUsedWeekL()-fuelUsed.getOrDefault(v.vehicleId(),0d);
    if (extraLitres > remaining+1e-9) return "FUEL_QUOTA";
    return null;
  }

  private Metrics metrics(List<OrderInput> orders, VehicleInput vehicle,
      Map<String,TravelInput> travel, Map<String,Integer> allowances) {
    LinkedHashMap<String,List<OrderInput>> grouped = new LinkedHashMap<>();
    orders.stream().sorted(Comparator.comparing(OrderInput::outletId).thenComparing(o->o.orderId().toString()))
        .forEach(o -> grouped.computeIfAbsent(o.outletId(), ignored->new ArrayList<>()).add(o));
    String district = orders.getFirst().outlet().district();
    TravelInput tr = travel.get(vehicle.depot()+"|"+district);
    if (tr == null) tr = new TravelInput(vehicle.depot(),district,60,20,50);
    int minutes = tr.depotMinutes(); double distance = tr.distanceKm();
    LocalTime cursor = LocalTime.of(6,0).plusMinutes(tr.depotMinutes());
    boolean valid = true; List<StopPlan> stops = new ArrayList<>(); int seq=1;
    for (var entry : grouped.entrySet()) {
      if (seq>1) { minutes += tr.interStopMinutes(); cursor=cursor.plusMinutes(tr.interStopMinutes()); distance += tr.distanceKm()*.15; }
      OrderInput first=entry.getValue().getFirst(); OutletInput outlet=first.outlet();
      LocalTime open=max(first.windowOpen(), outlet.mallWindowOpen()); LocalTime close=min(first.windowClose(),outlet.mallWindowClose());
      if (open!=null && cursor.isBefore(open)) { minutes += Duration.between(cursor,open).toMinutes(); cursor=open; }
      if (close!=null && cursor.isAfter(close)) valid=false;
      if (first.brand().equalsIgnoreCase("Fresh") && !cursor.isBefore(LocalTime.of(8,0))) valid=false;
      LocalTime eta=cursor;
      int allowance=allowances.getOrDefault(first.brand()+"|"+outlet.dockType(),20);
      minutes+=allowance;cursor=cursor.plusMinutes(allowance);
      stops.add(new StopPlan(seq++,entry.getKey(),outlet.name(),outlet.district(),outlet.dockType(),eta,List.copyOf(entry.getValue())));
    }
    double weight=orders.stream().mapToDouble(OrderInput::weightKg).sum();
    double volume=orders.stream().mapToDouble(OrderInput::volumeM3).sum();
    return new Metrics(weight,volume,minutes,distance,valid,List.copyOf(stops));
  }

  public List<String> validateTrip(TripPlan trip, Map<String,VehicleInput> vehicles,
      Map<String,TravelInput> travel, Map<String,Integer> allowances) {
    List<String> violations=new ArrayList<>(); VehicleInput v=vehicles.get(trip.vehicleId());
    if(v==null){return List.of("UNKNOWN_VEHICLE");}
    List<OrderInput> orders=trip.stops().stream().flatMap(s->s.orders().stream()).toList();
    if(orders.stream().map(OrderInput::brand).distinct().count()>1)violations.add("SAME_BRAND");
    if(orders.stream().map(o->o.outlet().district()).distinct().count()>1)violations.add("SAME_DISTRICT");
    if(orders.stream().anyMatch(o->structuralFailure(o,v)!=null))violations.add("VEHICLE_COMPATIBILITY");
    Metrics m=metrics(orders,v,travel,allowances);
    if(m.weight>v.weightCapKg())violations.add("WEIGHT_CAPACITY");if(m.volume>v.volumeCapM3())violations.add("VOLUME_CAPACITY");
    if(m.minutes>(orders.getFirst().brand().equalsIgnoreCase("Fresh")?270:480))violations.add("TIME_BUDGET");
    if(!m.windowsValid)violations.add("WINDOW");
    if(m.distanceKm/v.kmPerL()>v.weeklyFuelQuotaL()-v.fuelUsedWeekL())violations.add("FUEL_QUOTA");
    return violations;
  }

  public Comparator<OrderInput> priorityComparator() {
    Map<String,Integer> brand=Map.of("Fresh",0,"Style",1,"Tech",2);
    return Comparator.comparingInt((OrderInput o)->o.deferredYesterday()?0:1)
        .thenComparingInt(o->-o.daysSinceLastServed())
        .thenComparingInt(o->brand.getOrDefault(o.brand(),3))
        .thenComparingDouble((OrderInput o)->-o.orderValue()/Math.max(.001,o.weightKg()+o.volumeM3()*100))
        .thenComparing(o->o.orderId().toString());
  }

  private void recomputeVehicleUsage(String id,Map<String,List<MutableTrip>> all,Map<String,Integer> fresh,Map<String,Integer> other,Map<String,Double> fuel){
    fresh.put(id,all.get(id).stream().filter(t->t.brand.equalsIgnoreCase("Fresh")).mapToInt(t->t.minutes).sum());
    other.put(id,all.get(id).stream().filter(t->!t.brand.equalsIgnoreCase("Fresh")).mapToInt(t->t.minutes).sum());
    fuel.put(id,all.get(id).stream().mapToDouble(t->t.distanceKm/t.vehicle.kmPerL()).sum());
  }
  private String chooseReason(Set<String> failures){for(String r:List.of("VAN_ONLY","REEFER_SHORTAGE","CAPACITY","TIME_BUDGET","WINDOW","FUEL_QUOTA"))if(failures.contains(r))return r;return "CAPACITY";}
  private String humanReason(String r){return switch(r){case"REEFER_SHORTAGE"->"No reefer-capable vehicle is feasible";case"VAN_ONLY"->"Outlet requires a van";case"TIME_BUDGET"->"Vehicle trip/time budget is exhausted";case"WINDOW"->"Delivery window cannot be met";case"FUEL_QUOTA"->"Weekly fuel quota would be exceeded";default->"No vehicle has enough weight and volume capacity";};}
  private LocalTime max(LocalTime a,LocalTime b){if(a==null)return b;if(b==null)return a;return a.isAfter(b)?a:b;}
  private LocalTime min(LocalTime a,LocalTime b){if(a==null)return b;if(b==null)return a;return a.isBefore(b)?a:b;}

  private record Assignment(MutableTrip trip,Metrics metrics,String reason){}
  private record Metrics(double weight,double volume,int minutes,double distanceKm,boolean windowsValid,List<StopPlan> stops){}
  private static final class MutableTrip{
    final VehicleInput vehicle;final int tripNo;final String brand,district;final List<OrderInput> orders=new ArrayList<>();int minutes;double distanceKm,weight,volume;List<StopPlan>stops=List.of();
    MutableTrip(VehicleInput v,int n,String b,String d){vehicle=v;tripNo=n;brand=b;district=d;}
    List<OrderInput>ordersWith(OrderInput o){List<OrderInput>x=new ArrayList<>(orders);x.add(o);return x;}
    void add(OrderInput o,Metrics m){orders.add(o);minutes=m.minutes;distanceKm=m.distanceKm;weight=m.weight;volume=m.volume;stops=m.stops;}
    TripPlan freeze(LocalDate date){UUID id=UUID.nameUUIDFromBytes((date+"|"+vehicle.vehicleId()+"|"+tripNo).getBytes(StandardCharsets.UTF_8));return new TripPlan(id,vehicle.vehicleId(),vehicle.driverId(),tripNo,brand,district,stops,minutes,weight,vehicle.weightCapKg(),volume,vehicle.volumeCapM3(),distanceKm);}
  }
}
