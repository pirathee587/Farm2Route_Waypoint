package com.waypoint.planning.dto;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class PlanningModels {
  private PlanningModels() {}

  public record OrderInput(UUID orderId, String outletId, String productCode, int quantity,
      double weightKg, double volumeM3, String brand, String tempRequirement,
      LocalDate preferredDate, LocalTime windowOpen, LocalTime windowClose,
      double orderValue, OffsetDateTime closedAt, boolean deferredYesterday,
      int daysSinceLastServed, OutletInput outlet) {}

  public record OutletInput(String outletId, String name, String district, String depot,
      String parkingType, String dockType, LocalTime mallWindowOpen,
      LocalTime mallWindowClose, UUID storeManagerId) {}

  public record VehicleInput(String vehicleId, String registration, String type,
      double weightCapKg, double volumeCapM3, String tempCapability, String depot,
      String brand, UUID driverId, double kmPerL, double weeklyFuelQuotaL,
      double fuelUsedWeekL, boolean inWorkshop) {}

  public record TravelInput(String depot, String district, int depotMinutes,
      int interStopMinutes, double distanceKm) {}

  public record QueueGroup(String brand, String district, boolean deferredYesterday,
      int daysSinceLastServed, List<OrderInput> orders) {}

  public record StopPlan(int sequence, String outletId, String outletName, String district,
      String dockType, LocalTime eta, List<OrderInput> orders) {}

  public record TripPlan(UUID tripId, String vehicleId, UUID driverId, int tripNo,
      String brand, String district, List<StopPlan> stops, int tripMinutes,
      double loadKg, double capacityKg, double loadVolumeM3, double capacityVolumeM3,
      double distanceKm) {}

  public record DeferredOrder(UUID orderId, String outletId, String reason,
      String message, LocalDate newExpectedDate) {}

  public record AllocationResult(LocalDate date, List<TripPlan> servedTrips,
      List<DeferredOrder> deferred) {}

  public record ManualOverrideRequest(LocalDate date, TripPlan trip) {}
  public record ManualOverrideResponse(boolean valid, List<String> violations) {}
  public record DeferralHistory(UUID orderId, String outletId, LocalDate deliveryDate,
      String reason, String constraintType, LocalDate retryDate, Instant createdAt) {}
  public record ProgressRow(UUID tripId, String vehicleId, String tripStatus,
      String outletId, String stopStatus, Instant arrivedAt, Instant completedAt) {}
  public record PublishResponse(LocalDate date, int revision, int tripsPublished,
      int ordersDeferred) {}
}
