package com.waypoint.planning.entity;
import jakarta.persistence.*;import org.hibernate.annotations.JdbcTypeCode;import org.hibernate.type.SqlTypes;import java.time.*;import java.util.*;
@Entity @Table(name="planning_decisions",schema="public") public class PlanningDecisionEntity {
 @Id @GeneratedValue(strategy=GenerationType.UUID) @Column(name="decision_id") private UUID id; @Column(name="order_id") private UUID orderId; @Column(name="trip_id") private UUID tripId; @Column(name="decision_type",nullable=false) private String type; @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private String details; @Column(name="created_at",insertable=false,updatable=false) private Instant createdAt;
 protected PlanningDecisionEntity(){} public PlanningDecisionEntity(UUID orderId,UUID tripId,String type,String details){this.orderId=orderId;this.tripId=tripId;this.type=type;this.details=details;}
 public UUID getId(){return id;} public UUID getOrderId(){return orderId;} public String getType(){return type;}
}
