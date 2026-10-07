package com.waypoint.planning.constraint;

import com.waypoint.planning.model.PlanningModels.*;
import java.time.LocalDate;
import java.util.List;

public record PlanningContext(List<OrderRef> orders, VehicleRef vehicle, LocalDate planningDate,
                              List<StopPlan> stops, int existingTrips, boolean duplicateAllocation,
                              double currentWeekFuelL, double plannedFuelL, boolean fuelProjectionAvailable) {
    public PlanningContext(List<OrderRef> orders, VehicleRef vehicle, LocalDate planningDate,
                           List<StopPlan> stops, int existingTrips, boolean duplicateAllocation) {
        this(orders,vehicle,planningDate,stops,existingTrips,duplicateAllocation,
             vehicle.weeklyFuelUsedL(),0,false);
    }
    public double totalWeight(){return orders.stream().mapToDouble(OrderRef::weightKg).sum();}
    public double totalVolume(){return orders.stream().mapToDouble(OrderRef::volumeM3).sum();}
}
