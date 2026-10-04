package com.waypoint.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "vehicles", schema = "public")
public class VehicleEntity {

    @Id
    @Column(name = "vehicle_id")
    private String vehicleId;

    private String registration;
    private String type;

    @Column(name = "weight_cap_kg")
    private BigDecimal weightCapKg;

    @Column(name = "volume_cap_m3")
    private BigDecimal volumeCapM3;

    @Column(name = "temp_capability")
    private String tempCapability;

    private String depot;
    private String brand;

    public String getVehicleId() { return vehicleId; }
    public String getRegistration() { return registration; }
    public String getType() { return type; }
    public BigDecimal getWeightCapKg() { return weightCapKg; }
    public BigDecimal getVolumeCapM3() { return volumeCapM3; }
    public String getTempCapability() { return tempCapability; }
    public String getDepot() { return depot; }
    public String getBrand() { return brand; }
}