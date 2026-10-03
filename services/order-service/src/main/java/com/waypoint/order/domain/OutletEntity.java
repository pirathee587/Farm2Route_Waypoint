package com.waypoint.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "outlets", schema = "public")
public class OutletEntity {

    @Id
    @Column(name = "outlet_id")
    private String outletId;

    private String name;
    private String district;
    private String depot;

    @Column(name = "parking_type")
    private String parkingType;

    private BigDecimal lat;
    private BigDecimal lng;

    public String getOutletId() { return outletId; }
    public String getName() { return name; }
    public String getDistrict() { return district; }
    public String getDepot() { return depot; }
    public String getParkingType() { return parkingType; }
    public BigDecimal getLat() { return lat; }
    public BigDecimal getLng() { return lng; }
}