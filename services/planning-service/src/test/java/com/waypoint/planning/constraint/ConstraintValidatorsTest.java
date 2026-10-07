package com.waypoint.planning.constraint;

import com.waypoint.planning.model.PlanningModels.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class ConstraintValidatorsTest {
    private final LocalDate date=LocalDate.of(2026,9,25);
    private OrderRef order(double weight,double volume,String temp,String parking,String depot,LocalTime open,LocalTime close){
        return new OrderRef(UUID.randomUUID(),"OUT-1","Outlet","Colombo",depot,parking,null,null,"SKU",1,weight,volume,"Fresh",temp,date,open,close,"PENDING");
    }
    private VehicleRef vehicle(double weight,double volume,String temp,String type,String depot,boolean active,boolean available,double quota,double used){
        return new VehicleRef("VEH-1","REG",type,weight,volume,temp,depot,"Fresh",null,active,available,quota,used);
    }
    private PlanningContext context(OrderRef o,VehicleRef v,int trips,LocalTime arrival){
        StopPlan stop=new StopPlan(1,o.orderId(),o.outletId(),o.outletName(),arrival,o.windowOpen(),o.windowClose(),o.weightKg(),o.volumeM3());
        return new PlanningContext(List.of(o),v,date,List.of(stop),trips,false,v.weeklyFuelUsedL(),0,true);
    }
    private void pass(ConstraintCheck c){assertThat(c.status()).isEqualTo("PASSED");}
    private void fail(ConstraintCheck c){assertThat(c.status()).isEqualTo("FAILED");assertThat(c.blocking()).isTrue();}

    @Test void weightPassAndFail(){var o=order(820,7.8,"AMBIENT","STANDARD","D1",LocalTime.of(7,0),LocalTime.of(9,0));pass(new WeightConstraintValidator().validate(context(o,vehicle(1000,10,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.of(7,0))));fail(new WeightConstraintValidator().validate(context(o,vehicle(800,10,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.of(7,0))));}
    @Test void volumePassAndFail(){var o=order(1,7.8,"AMBIENT","STANDARD","D1",LocalTime.of(7,0),LocalTime.of(9,0));pass(new VolumeConstraintValidator().validate(context(o,vehicle(10,8,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.of(7,0))));fail(new VolumeConstraintValidator().validate(context(o,vehicle(10,7,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.of(7,0))));}
    @Test void temperatureMatrix(){var ambient=order(1,1,"AMBIENT","STANDARD","D1",LocalTime.MIN,LocalTime.MAX);var chilled=order(1,1,"CHILLED","STANDARD","D1",LocalTime.MIN,LocalTime.MAX);pass(new TemperatureConstraintValidator().validate(context(ambient,vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.NOON)));pass(new TemperatureConstraintValidator().validate(context(chilled,vehicle(2,2,"CHILLED","TRUCK","D1",true,true,0,0),0,LocalTime.NOON)));fail(new TemperatureConstraintValidator().validate(context(chilled,vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.NOON)));}
    @Test void vanOnlyMatrix(){var o=order(1,1,"AMBIENT","RESTRICTED","D1",LocalTime.MIN,LocalTime.MAX);pass(new OutletAccessConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","VAN","D1",true,true,0,0),0,LocalTime.NOON)));fail(new OutletAccessConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.NOON)));}
    @Test void depotMatrix(){var o=order(1,1,"AMBIENT","STANDARD","D1",LocalTime.MIN,LocalTime.MAX);pass(new HomeDepotConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.NOON)));fail(new HomeDepotConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","TRUCK","D2",true,true,0,0),0,LocalTime.NOON)));}
    @Test void fuelMatrix(){var o=order(1,1,"AMBIENT","STANDARD","D1",LocalTime.MIN,LocalTime.MAX);var vehicle=vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,100,90);var base=context(o,vehicle,0,LocalTime.NOON);pass(new FuelQuotaConstraintValidator().validate(base));var projected=new PlanningContext(base.orders(),base.vehicle(),base.planningDate(),base.stops(),0,false,90,11,true);var result=new FuelQuotaConstraintValidator().validate(projected);fail(result);assertThat(result.code()).isEqualTo("FUEL_QUOTA_EXCEEDED");assertThat(result.message()).contains("Used: 90.00L").contains("Planned: 11.00L").contains("Quota: 100.00L");}
    @Test void tripsPerDayAllowsAtMostTwo(){var o=order(1,1,"AMBIENT","STANDARD","D1",LocalTime.MIN,LocalTime.MAX);var v=vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0);pass(new TripsPerDayConstraintValidator().validate(context(o,v,0,LocalTime.NOON)));pass(new TripsPerDayConstraintValidator().validate(context(o,v,1,LocalTime.NOON)));var result=new TripsPerDayConstraintValidator().validate(context(o,v,2,LocalTime.NOON));fail(result);assertThat(result.code()).isEqualTo("TRIP_LIMIT_REACHED");assertThat(result.message()).contains("VEH-1").contains(date.toString()).contains("Maximum 2 trips");}
    @Test void availabilityMatrix(){var o=order(1,1,"AMBIENT","STANDARD","D1",LocalTime.MIN,LocalTime.MAX);pass(new VehicleAvailabilityConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0),0,LocalTime.NOON)));fail(new VehicleAvailabilityConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","TRUCK","D1",true,false,0,0),0,LocalTime.NOON)));fail(new VehicleAvailabilityConstraintValidator().validate(context(o,vehicle(2,2,"AMBIENT","TRUCK","D1",false,false,0,0),0,LocalTime.NOON)));}
    @Test void deliveryWindowMatrix(){var o=order(1,1,"AMBIENT","STANDARD","D1",LocalTime.of(8,0),LocalTime.of(10,0));var v=vehicle(2,2,"AMBIENT","TRUCK","D1",true,true,0,0);pass(new DeliveryWindowConstraintValidator().validate(context(o,v,0,LocalTime.of(9,0))));fail(new DeliveryWindowConstraintValidator().validate(context(o,v,0,LocalTime.of(11,0))));}
}
