package com.waypoint.planning.entity;
import jakarta.persistence.*;import java.time.*;
@Entity @Table(name="vehicle_planning_state",schema="public") public class VehiclePlanningStateEntity {
 @Id @Column(name="vehicle_id") private String vehicleId;private boolean available;@Column(name="weekly_fuel_quota_l",columnDefinition="numeric") private double weeklyFuelQuota;@Column(name="weekly_fuel_used_l",columnDefinition="numeric") private double weeklyFuelUsed;@Column(name="updated_at",insertable=false,updatable=false) private Instant updatedAt;protected VehiclePlanningStateEntity(){}public String getVehicleId(){return vehicleId;}public boolean isAvailable(){return available;}public double getWeeklyFuelQuota(){return weeklyFuelQuota;}public double getWeeklyFuelUsed(){return weeklyFuelUsed;}
}
