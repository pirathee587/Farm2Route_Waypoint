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

    public record ConstraintCheck(String code, String status, String message, UUID affectedOrderId) {}

    public record StopPlan(int sequence, UUID orderId, String outletId, String outletName,
                           LocalTime plannedArrival, LocalTime windowOpen, LocalTime windowClose,
                           double weightKg, double volumeM3) {}

    public record ValidationResult(boolean feasible, double totalWeightKg, double totalVolumeM3,
                                   List<ConstraintCheck> checks, List<StopPlan> stops) {}

    public record TripView(UUID tripId, String vehicleId, UUID driverId, int tripNumber,
                           LocalDate deliveryDate, String status, double totalWeightKg,
                           double totalVolumeM3, List<StopPlan> stops) {}

    public record DashboardSummary(long ordersToday, long planned, long unplanned, long deferred,
                                   long availableVehicles, long totalVehicles, long reeferAvailable,
                                   long reeferTotal, long tripsNeedingReview) {}

    public record DeferralRequest(String reason, String constraintType, LocalDate retryDate) {}
    public record DeferralView(UUID deferralId, UUID orderId, LocalDate deliveryDate, String reason,
                               String constraintType, LocalDate retryDate, boolean notified, Instant createdAt) {}

    public record SuggestedTrip(String vehicleId, List<UUID> orderIds, ValidationResult validation) {}
    public record SuggestionResponse(LocalDate deliveryDate, List<SuggestedTrip> trips,
                                     List<UUID> unallocatedOrderIds) {}

    public record ShortfallItem(UUID orderId, String outletName, String reason, String constraintType,
                                LocalDate retryDate) {}
    public record ShortfallSummary(int totalOrders, int serviceable, int requiresDecision,
                                   List<ShortfallItem> affectedOrders) {}
}
