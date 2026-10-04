package com.waypoint.planning.constraint;

import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.PlanningRepository;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;

@Component
public class ConstraintEngine {
    private final PlanningRepository planning;
    public ConstraintEngine(PlanningRepository planning){this.planning=planning;}

    public ValidationResult validate(List<OrderRef> orders, VehicleRef v, LocalDate date, List<UUID> requestedSequence) {
        List<ConstraintCheck> checks=new ArrayList<>();
        double weight=orders.stream().mapToDouble(OrderRef::weightKg).sum();
        double volume=orders.stream().mapToDouble(OrderRef::volumeM3).sum();
        add(checks,"WEIGHT",weight<=v.weightCapKg(),"%.1f / %.1f kg".formatted(weight,v.weightCapKg()),null);
        add(checks,"VOLUME",volume<=v.volumeCapM3(),"%.2f / %.2f m3".formatted(volume,v.volumeCapM3()),null);
        add(checks,"VEHICLE",v.active()&&v.available(),v.available()?"Vehicle available":"Vehicle unavailable",null);
        add(checks,"TRIPS",planning.tripCount(v.vehicleId(),date)<2,"Routes used: "+planning.tripCount(v.vehicleId(),date)+" of 2",null);

        boolean depot=orders.stream().allMatch(o->eq(o.depot(),v.depot()));
        add(checks,"DEPOT",depot,"Vehicle home depot must match order depot",firstFail(orders,o->!eq(o.depot(),v.depot())));
        boolean brand=orders.stream().allMatch(o->eq(o.brand(),orders.getFirst().brand())) && orders.stream().allMatch(o->eq(o.brand(),v.brand()));
        add(checks,"BRAND",brand,"Trip and vehicle brand compatibility",firstFail(orders,o->!eq(o.brand(),v.brand())));
        boolean district=orders.stream().allMatch(o->eq(o.district(),orders.getFirst().district()));
        add(checks,"DISTRICT",district,"Orders in one trip must share a district",firstFail(orders,o->!eq(o.district(),orders.getFirst().district())));

        UUID tempFail=firstFail(orders,o->tempRank(v.tempCapability())<tempRank(o.tempRequirement()));
        add(checks,"TEMP",tempFail==null,"Vehicle temperature capability must satisfy every order",tempFail);
        UUID accessFail=firstFail(orders,o->"RESTRICTED".equalsIgnoreCase(o.parkingType()) && !"VAN".equalsIgnoreCase(v.type()));
        add(checks,"PARKING",accessFail==null,"Restricted/van-only outlets require a van",accessFail);

        List<OrderRef> seq=sequence(orders,requestedSequence);
        List<StopPlan> stops=buildStops(seq);
        UUID windowFail=stops.stream().filter(s->s.plannedArrival()!=null && s.windowClose()!=null && s.plannedArrival().isAfter(s.windowClose())).map(StopPlan::orderId).findFirst().orElse(null);
        add(checks,"WINDOW",windowFail==null,"Estimated arrival must be inside delivery window",windowFail);

        boolean fuelOk=v.weeklyFuelQuotaL()<=0 || v.weeklyFuelUsedL()<v.weeklyFuelQuotaL();
        checks.add(new ConstraintCheck("FUEL",v.weeklyFuelQuotaL()<=0?"NOT_EVALUATED":fuelOk?"VALID":"FAILED",
                v.weeklyFuelQuotaL()<=0?"Fuel quota data not configured":("%.1f / %.1f L used".formatted(v.weeklyFuelUsedL(),v.weeklyFuelQuotaL())),null));

        boolean duplicate=orders.stream().anyMatch(o->planning.orderAlreadyAllocated(o.orderId(),date));
        add(checks,"DUPLICATE_ALLOCATION",!duplicate,"Order cannot be allocated to two active trips",firstFail(orders,o->planning.orderAlreadyAllocated(o.orderId(),date)));
        boolean feasible=checks.stream().noneMatch(c->"FAILED".equals(c.status()));
        return new ValidationResult(feasible,weight,volume,List.copyOf(checks),stops);
    }

    private List<StopPlan> buildStops(List<OrderRef> seq){
        List<StopPlan> out=new ArrayList<>(); LocalTime cursor=seq.isEmpty()?LocalTime.of(6,0):seq.getFirst().windowOpen();
        for(int i=0;i<seq.size();i++){
            OrderRef o=seq.get(i); if(cursor.isBefore(o.windowOpen())) cursor=o.windowOpen();
            out.add(new StopPlan(i+1,o.orderId(),o.outletId(),o.outletName(),cursor,o.windowOpen(),o.windowClose(),o.weightKg(),o.volumeM3()));
            cursor=cursor.plusMinutes(40); // booklet operational service-time approximation used by prototype
        } return List.copyOf(out);
    }
    private List<OrderRef> sequence(List<OrderRef> orders,List<UUID> ids){
        if(ids==null||ids.isEmpty()) return orders.stream().sorted(Comparator.comparing(OrderRef::windowClose)).toList();
        Map<UUID,OrderRef> m=new HashMap<>();orders.forEach(o->m.put(o.orderId(),o));
        List<OrderRef> out=new ArrayList<>(); for(UUID id:ids) if(m.containsKey(id)) out.add(m.remove(id)); out.addAll(m.values()); return out;
    }
    private static void add(List<ConstraintCheck> c,String code,boolean ok,String msg,UUID id){c.add(new ConstraintCheck(code,ok?"VALID":"FAILED",msg,id));}
    private static UUID firstFail(List<OrderRef> os,java.util.function.Predicate<OrderRef> p){return os.stream().filter(p).map(OrderRef::orderId).findFirst().orElse(null);}
    private static boolean eq(String a,String b){return a!=null&&b!=null&&a.equalsIgnoreCase(b);}
    private static int tempRank(String s){if(s==null)return 0;return switch(s.toUpperCase()){case "FROZEN"->3;case "CHILLED"->2;default->1;};}
}
