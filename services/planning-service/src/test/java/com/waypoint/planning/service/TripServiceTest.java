package com.waypoint.planning.constraint;

import com.waypoint.planning.constraint.*;
import com.waypoint.planning.exception.PlanningException;
import com.waypoint.planning.model.PlanningModels.*;
import com.waypoint.planning.repository.*;
import com.waypoint.planning.service.TripService;
import org.junit.jupiter.api.*;
import org.mockito.*;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TripServiceTest {
    private ReferenceRepository refs;private PlanningRepository repo;private TripService service;
    private final LocalDate date=LocalDate.of(2026,9,25);
    private OrderRef order(double weight,double volume,String temp){return new OrderRef(UUID.randomUUID(),"OUT","Outlet","Colombo","D1","STANDARD",null,null,"SKU",1,weight,volume,"Fresh",temp,date,LocalTime.of(6,0),LocalTime.of(12,0),"PENDING");}
    private VehicleRef vehicle(String temp){return new VehicleRef("VEH-1","REG","TRUCK",4000,18,temp,"D1","Fresh",UUID.randomUUID(),true,true,100,50);}
    @BeforeEach void setup(){
        refs=mock(ReferenceRepository.class);repo=mock(PlanningRepository.class);
        List<ConstraintValidator> validators=List.of(new WeightConstraintValidator(),new VolumeConstraintValidator(),new TemperatureConstraintValidator(),new OutletAccessConstraintValidator(),new HomeDepotConstraintValidator(),new DeliveryWindowConstraintValidator(),new FuelQuotaConstraintValidator(),new TripsPerDayConstraintValidator(),new VehicleAvailabilityConstraintValidator(),new BrandConstraintValidator(),new DistrictConstraintValidator(),new DuplicateAllocationConstraintValidator());
        service=new TripService(refs,new ConstraintEngine(repo,validators));
    }
    @Test void chilledOrdersAreFeasibleWithExpectedTotals(){
        var a=order(820,7.8,"CHILLED");var b=order(690,6.4,"CHILLED");var v=vehicle("CHILLED");var req=new TripDraftRequest(date,List.of(a.orderId(),b.orderId()),v.vehicleId(),List.of(a.orderId(),b.orderId()));
        when(refs.getOrders(req.orderIds())).thenReturn(List.of(a,b));when(refs.getVehicle(v.vehicleId())).thenReturn(v);when(repo.tripCount(v.vehicleId(),date)).thenReturn(1);
        var validation=service.validate(req);assertThat(validation.feasible()).isTrue();assertThat(validation.totalWeightKg()).isEqualTo(1510);assertThat(validation.totalVolumeM3()).isEqualTo(14.2);
    }
    @Test void dryVehicleFailsChilledOrdersAndConfirmation(){
        var o=order(820,7.8,"CHILLED");var v=vehicle("AMBIENT");var req=new TripDraftRequest(date,List.of(o.orderId()),v.vehicleId(),List.of());when(refs.getOrders(req.orderIds())).thenReturn(List.of(o));when(refs.getVehicle(v.vehicleId())).thenReturn(v);
        assertThat(service.validate(req).checks()).anyMatch(c->c.code().equals("TEMPERATURE")&&c.status().equals("FAILED"));
    }
    @Test void vehicleAtTripLimitIsRejected(){
        var o=order(10,1,"AMBIENT");var v=vehicle("AMBIENT");var req=new TripDraftRequest(date,List.of(o.orderId()),v.vehicleId(),List.of());when(refs.getOrders(req.orderIds())).thenReturn(List.of(o));when(refs.getVehicle(v.vehicleId())).thenReturn(v);when(repo.tripCount(v.vehicleId(),date)).thenReturn(2);
        assertThat(service.validate(req).checks()).anyMatch(c->c.code().equals("TRIPS_PER_DAY")&&c.status().equals("FAILED"));
    }
    @Test void duplicateOrdersAreRejected(){var id=UUID.randomUUID();var req=new TripDraftRequest(date,List.of(id,id),"VEH-1",List.of());assertThatThrownBy(()->service.validate(req)).isInstanceOf(PlanningException.class).hasMessageContaining("Duplicate");}
}
