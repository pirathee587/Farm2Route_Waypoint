package com.waypoint.planning.model;

import java.time.*;
import java.util.*;

public final class PlanningModels {
    private PlanningModels() {}

    public record OrderRef(UUID orderId, String outletId, String outletName, String district, String depot,
                           String parkingType, Double lat, Double lng, String productCode, int quantity,
                           double weightKg, double volumeM3, String brand, String tempRequirement,
                           LocalDate preferredDate, LocalTime windowOpen, LocalTime windowClose, String orderStatus) {}

    public record VehicleRef(String vehicleId, String registration, String type, double weightCapKg,
                             double volumeCapM3, String tempCapability, String depot, String brand,
                             UUID driverId, boolean active, boolean available, double weeklyFuelQuotaL,
                             double weeklyFuelUsedL) {}

    public record TripDraftRequest(LocalDate deliveryDate, List<UUID> orderIds, String vehicleId,
                                   List<UUID> stopOrderIds) {}

    public record ConstraintCheck(String code, String status, String message, boolean blocking,
                                  String actualValue, String limitValue, UUID affectedOrderId) {
        public static ConstraintCheck passed(String code,String message,String actual,String limit){return new ConstraintCheck(code,"PASSED",message,true,actual,limit,null);}
        public static ConstraintCheck failed(String code,String message,String actual,String limit,UUID orderId){return new ConstraintCheck(code,"FAILED",message,true,actual,limit,orderId);}
        public static ConstraintCheck notEvaluated(String code,String message){return new ConstraintCheck(code,"NOT_EVALUATED",message,false,null,null,null);}
    }

    public record StopPlan(int sequence, UUID orderId, String outletId, String outletName,
                           LocalTime plannedArrival, LocalTime windowOpen, LocalTime windowClose,
                           double weightKg, double volumeM3) {}

    public record ValidationResult(boolean feasible, double totalWeightKg, double totalVolumeM3,
                                   List<ConstraintCheck> checks, List<StopPlan> stops) {
        public List<String> blockingReasons(){return checks.stream().filter(c->c.blocking()&&"FAILED".equals(c.status())).map(ConstraintCheck::message).toList();}
    }

    public record TripView(UUID tripId, String vehicleId, UUID driverId, int tripNumber,
                           LocalDate deliveryDate, String status, double totalWeightKg,
                           double totalVolumeM3, List<StopPlan> stops) {}

    public record DashboardSummary(long totalOrders, long plannedOrders, long unplannedOrders, long deferredOrders,
                                   long availableVehicles, long totalVehicles, long availableReefers,
                                   long totalReefers, long activeTrips, long issuesCount) {}

    public record DeferralRequest(String reason, String reasonCode, String reasonDescription,
                                  String constraintType, LocalDate retryDate, LocalDate nextPlannedDate,
                                  String operationalNote) {
        public String resolvedReason(){return reasonDescription!=null&&!reasonDescription.isBlank()?reasonDescription:reason;}
        public LocalDate resolvedDate(){return nextPlannedDate!=null?nextPlannedDate:retryDate;}
    }
    public record DeferralView(UUID deferralId, UUID orderId, LocalDate deliveryDate, String reason,
                               String constraintType, LocalDate retryDate, boolean notified, Instant createdAt,
                               String outletName, String district, String depot, String brand,
                               String tempRequirement, double weightKg, double volumeM3,
                               LocalTime windowOpen, LocalTime windowClose) {}

    public record UpdateNextPlannedDateRequest(LocalDate nextPlannedDate,String reasonForChange) {}

    public record SuggestedTrip(String vehicleId, List<UUID> orderIds, ValidationResult validation) {}
    public record SuggestionResponse(LocalDate deliveryDate, List<SuggestedTrip> trips,
                                     List<UUID> unallocatedOrderIds) {}

    public record ShortfallItem(UUID orderId, String outletName, String reason, String constraintType,
                                LocalDate retryDate) {}
    public record ShortfallSummary(int totalOrders, int serviceable, int requiresDecision,
                                   List<ShortfallItem> affectedOrders) {}
}
