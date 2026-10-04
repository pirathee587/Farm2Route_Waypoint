package com.waypoint.planning.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.*;
import java.util.*;

@Entity @Table(name="trips",schema="public")
public class TripEntity {
 @Id @GeneratedValue(strategy=GenerationType.UUID) @Column(name="trip_id") private UUID id;
 @Column(name="trip_code") private String tripCode;
 @Column(name="vehicle_id") private String vehicleId;
 @Column(name="driver_id") private UUID driverId;
 @Column(name="trip_number") private Short tripNumber;
 @Column(name="delivery_date",nullable=false) private LocalDate planningDate;
 @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(nullable=false,columnDefinition="trip_status") private TripStatus status;
 @Column(name="stop_sequence",columnDefinition="text[]",insertable=false,updatable=false) private String[] legacyStopSequence;
 @Column(name="total_weight_kg",nullable=false,columnDefinition="numeric") private double totalWeight;
 @Column(name="total_volume_m3",nullable=false,columnDefinition="numeric") private double totalVolume;
 @Column(name="home_depot") private String homeDepot;
 @JdbcTypeCode(SqlTypes.JSON) @Column(name="validation_snapshot",columnDefinition="jsonb") private String validationSnapshot;
 @Column(name="confirmed_at") private Instant confirmedAt;
 @Column(name="created_at",insertable=false,updatable=false) private Instant createdAt;
 @Column(name="updated_at",insertable=false,updatable=false) private Instant updatedAt;
 @Version private long version;
 protected TripEntity(){}
 public TripEntity(LocalDate date,String depot){planningDate=date;homeDepot=depot;status=TripStatus.DRAFT;totalWeight=0;totalVolume=0;}
 public UUID getId(){return id;} public String getTripCode(){return tripCode;} public void setTripCode(String v){tripCode=v;} public String getVehicleId(){return vehicleId;} public void setVehicle(String id,UUID driver){vehicleId=id;driverId=driver;invalidate();} public UUID getDriverId(){return driverId;} public Integer getTripNumber(){return tripNumber==null?null:tripNumber.intValue();} public void setTripNumber(Integer n){tripNumber=n==null?null:n.shortValue();} public LocalDate getPlanningDate(){return planningDate;} public void setPlanningDate(LocalDate d){planningDate=d;invalidate();} public String getHomeDepot(){return homeDepot;} public void setHomeDepot(String d){homeDepot=d;invalidate();} public TripStatus getStatus(){return status;} public void setStatus(TripStatus s){status=s;} public double getTotalWeight(){return totalWeight;} public double getTotalVolume(){return totalVolume;} public void setTotals(double w,double v){totalWeight=w;totalVolume=v;} public String getValidationSnapshot(){return validationSnapshot;} public void setValidationSnapshot(String s){validationSnapshot=s;} public Instant getConfirmedAt(){return confirmedAt;} public void confirm(){status=TripStatus.CONFIRMED;confirmedAt=Instant.now();} public boolean editable(){return status==TripStatus.DRAFT||status==TripStatus.FEASIBLE||status==TripStatus.INFEASIBLE;} public void invalidate(){if(status!=TripStatus.DRAFT)status=TripStatus.DRAFT;validationSnapshot=null;}
}
