package com.waypoint.planning.entity;
import jakarta.persistence.*;import java.time.*;import java.util.*;
@Entity @Table(name="trip_stops",schema="public",uniqueConstraints={@UniqueConstraint(columnNames={"trip_id","order_id"}),@UniqueConstraint(columnNames={"trip_id","stop_sequence"})})
public class TripStopEntity {
 @Id @GeneratedValue(strategy=GenerationType.UUID) @Column(name="trip_stop_id") private UUID id;
 @Column(name="trip_id",nullable=false) private UUID tripId; @Column(name="order_id",nullable=false) private UUID orderId; @Column(name="outlet_id",nullable=false) private String outletId; @Column(name="stop_sequence",nullable=false) private int sequence; @Column(name="planned_arrival") private LocalTime plannedArrival; @Column(name="delivery_window_start") private LocalTime windowStart; @Column(name="delivery_window_end") private LocalTime windowEnd;
 protected TripStopEntity(){} public TripStopEntity(UUID tripId,UUID orderId,String outletId,int sequence,LocalTime open,LocalTime close){this.tripId=tripId;this.orderId=orderId;this.outletId=outletId;this.sequence=sequence;windowStart=open;windowEnd=close;}
 public UUID getId(){return id;} public UUID getTripId(){return tripId;} public UUID getOrderId(){return orderId;} public String getOutletId(){return outletId;} public int getSequence(){return sequence;} public void setSequence(int v){sequence=v;} public LocalTime getPlannedArrival(){return plannedArrival;} public void setPlannedArrival(LocalTime v){plannedArrival=v;} public LocalTime getWindowStart(){return windowStart;} public LocalTime getWindowEnd(){return windowEnd;}
}
