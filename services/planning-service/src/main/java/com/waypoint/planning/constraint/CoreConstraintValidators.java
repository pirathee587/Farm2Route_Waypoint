package com.waypoint.planning.constraint;

import com.waypoint.planning.model.PlanningModels.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.time.LocalTime;
import java.util.UUID;
import java.util.function.Predicate;

final class Checks {
    private Checks(){}
    static ConstraintCheck result(String code,boolean ok,String message,String actual,String limit,UUID order){
        return ok?ConstraintCheck.passed(code,message,actual,limit):ConstraintCheck.failed(code,message,actual,limit,order);
    }
    static UUID first(PlanningContext c, Predicate<OrderRef> p){return c.orders().stream().filter(p).map(OrderRef::orderId).findFirst().orElse(null);}
    static boolean eq(String a,String b){return a!=null&&b!=null&&a.equalsIgnoreCase(b);}
    static int temp(String s){return s==null?0:s.equalsIgnoreCase("FROZEN")?3:s.equalsIgnoreCase("CHILLED")?2:1;}
}

@Component @Order(10) class WeightConstraintValidator implements ConstraintValidator {
    public String code(){return "WEIGHT";}
    public ConstraintCheck validate(PlanningContext c){double a=c.totalWeight(),l=c.vehicle().weightCapKg();return Checks.result(code(),a<=l,"Total order weight must not exceed vehicle capacity",String.valueOf(a),String.valueOf(l),null);}
}
@Component @Order(20) class VolumeConstraintValidator implements ConstraintValidator {
    public String code(){return "VOLUME";}
    public ConstraintCheck validate(PlanningContext c){double a=c.totalVolume(),l=c.vehicle().volumeCapM3();return Checks.result(code(),a<=l,"Total order volume must not exceed vehicle capacity",String.valueOf(a),String.valueOf(l),null);}
}
@Component @Order(30) class TemperatureConstraintValidator implements ConstraintValidator {
    public String code(){return "TEMPERATURE";}
    public ConstraintCheck validate(PlanningContext c){UUID id=Checks.first(c,o->Checks.temp(c.vehicle().tempCapability())<Checks.temp(o.tempRequirement()));return Checks.result(code(),id==null,"Vehicle refrigeration must satisfy every order",c.vehicle().tempCapability(),"highest order requirement",id);}
}
@Component @Order(40) class OutletAccessConstraintValidator implements ConstraintValidator {
    public String code(){return "OUTLET_ACCESS";}
    public ConstraintCheck validate(PlanningContext c){UUID id=Checks.first(c,o->"RESTRICTED".equalsIgnoreCase(o.parkingType())&&!"VAN".equalsIgnoreCase(c.vehicle().type()));return Checks.result(code(),id==null,"Restricted outlets require a van",c.vehicle().type(),"VAN",id);}
}
@Component @Order(50) class HomeDepotConstraintValidator implements ConstraintValidator {
    public String code(){return "HOME_DEPOT";}
    public ConstraintCheck validate(PlanningContext c){UUID id=Checks.first(c,o->!Checks.eq(o.depot(),c.vehicle().depot()));return Checks.result(code(),id==null,"Vehicle home depot must match every order depot",c.vehicle().depot(),"order depot",id);}
}
@Component @Order(60) class DeliveryWindowConstraintValidator implements ConstraintValidator {
    public String code(){return "DELIVERY_WINDOW";}
    public ConstraintCheck validate(PlanningContext c){StopPlan bad=c.stops().stream().filter(s->{LocalTime a=s.plannedArrival();return a==null||(s.windowOpen()!=null&&a.isBefore(s.windowOpen()))||(s.windowClose()!=null&&a.isAfter(s.windowClose()));}).findFirst().orElse(null);return Checks.result(code(),bad==null,"Deterministic planned arrival must be within each delivery window",bad==null?"all within window":String.valueOf(bad.plannedArrival()),bad==null?"delivery windows":bad.windowOpen()+"-"+bad.windowClose(),bad==null?null:bad.orderId());}
}
@Component @Order(70) class FuelQuotaConstraintValidator implements ConstraintValidator {
    public String code(){return "FUEL_QUOTA_EXCEEDED";}
    public ConstraintCheck validate(PlanningContext c){
        double quota=c.vehicle().weeklyFuelQuotaL();
        if(quota<=0)return ConstraintCheck.notEvaluated(code(),"Authoritative weekly fuel quota is not configured");
        if(!c.fuelProjectionAvailable())return ConstraintCheck.notEvaluated(code(),"Fuel efficiency or district travel data is not configured");
        double used=c.currentWeekFuelL(),planned=c.plannedFuelL();
        String reason=String.format(java.util.Locale.ROOT,"Vehicle %s would exceed weekly fuel quota. Used: %.2fL, Planned: %.2fL, Quota: %.2fL",c.vehicle().vehicleId(),used,planned,quota);
        return Checks.result(code(),used+planned<=quota,reason,String.format(java.util.Locale.ROOT,"%.2f",used+planned),String.format(java.util.Locale.ROOT,"%.2f",quota),null);
    }
}
@Component @Order(80) class TripsPerDayConstraintValidator implements ConstraintValidator {
    public String code(){return "TRIP_LIMIT_REACHED";}
    public ConstraintCheck validate(PlanningContext c){
        int assignedTrips=c.existingTrips();
        String reason="Vehicle "+c.vehicle().vehicleId()+" already has "+assignedTrips+" trips assigned for "+c.planningDate()+". Maximum 2 trips per vehicle per day.";
        return Checks.result(code(),assignedTrips<2,reason,String.valueOf(assignedTrips),"2",null);
    }
}
@Component @Order(90) class VehicleAvailabilityConstraintValidator implements ConstraintValidator {
    public String code(){return "VEHICLE_AVAILABILITY";}
    public ConstraintCheck validate(PlanningContext c){boolean ok=c.vehicle().active()&&c.vehicle().available();return Checks.result(code(),ok,"Vehicle must be active and operationally available",String.valueOf(ok),"true",null);}
}
@Component @Order(100) class BrandConstraintValidator implements ConstraintValidator {
    public String code(){return "BRAND";}
    public ConstraintCheck validate(PlanningContext c){UUID id=Checks.first(c,o->!Checks.eq(o.brand(),c.vehicle().brand()));return Checks.result(code(),id==null,"Vehicle brand must match every order",c.vehicle().brand(),"order brand",id);}
}
@Component @Order(110) class DistrictConstraintValidator implements ConstraintValidator {
    public String code(){return "DISTRICT";}
    public ConstraintCheck validate(PlanningContext c){if(c.orders().isEmpty())return ConstraintCheck.passed(code(),"No district conflict",null,null);String d=c.orders().getFirst().district();UUID id=Checks.first(c,o->!Checks.eq(o.district(),d));return Checks.result(code(),id==null,"Orders in one trip must share a district",d,"same district",id);}
}
@Component @Order(120) class DuplicateAllocationConstraintValidator implements ConstraintValidator {
    public String code(){return "DUPLICATE_ALLOCATION";}
    public ConstraintCheck validate(PlanningContext c){return Checks.result(code(),!c.duplicateAllocation(),"An order cannot have two active allocations",String.valueOf(c.duplicateAllocation()),"false",null);}
}
