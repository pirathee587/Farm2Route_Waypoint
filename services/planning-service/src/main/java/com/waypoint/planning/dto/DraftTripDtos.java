package com.waypoint.planning.dto;
import com.waypoint.planning.model.PlanningModels.*;import jakarta.validation.constraints.*;import java.time.*;import java.util.*;
public final class DraftTripDtos {
 private DraftTripDtos(){}
 public record CreateTripRequest(@NotNull LocalDate planningDate,@NotBlank String homeDepot){}
 public record UpdateTripRequest(LocalDate planningDate,String homeDepot){}
 public record AddOrderRequest(@NotNull UUID orderId){}
 public record AssignVehicleRequest(@NotBlank String vehicleId){}
 public record AssignDriverRequest(@NotNull UUID driverId){}
 public record UpdateStopsRequest(@NotEmpty List<@NotNull UUID> orderIds){}
 public record DraftOrder(UUID orderId,String outletId,String outletName,double weightKg,double volumeM3,String temperatureRequirement){}
 public record PersistedTripResponse(UUID tripId,String tripCode,String status,LocalDate planningDate,String homeDepot,String vehicleId,UUID driverId,Integer tripNumber,double totalWeight,double totalVolume,List<DraftOrder> orders,List<StopPlan> stops,ValidationResult validation){}
 public record TripValidationResponse(UUID tripId,boolean feasible,double totalWeight,double maxWeight,double totalVolume,double maxVolume,List<ConstraintCheck> constraints,List<String> blockingReasons){}
}
