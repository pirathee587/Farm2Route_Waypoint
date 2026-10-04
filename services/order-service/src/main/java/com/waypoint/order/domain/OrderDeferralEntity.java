package com.waypoint.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "order_deferrals", schema = "public")
public class OrderDeferralEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "original_date", nullable = false)
    private LocalDate originalDate;

    @Column(name = "revised_date")
    private LocalDate revisedDate;

    @Column(name = "is_repeat_deferral", nullable = false)
    private boolean repeatDeferral;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public void setOrderId(UUID orderId) { this.orderId = orderId; }
    public void setReason(String reason) { this.reason = reason; }
    public void setOriginalDate(LocalDate originalDate) { this.originalDate = originalDate; }
    public void setRevisedDate(LocalDate revisedDate) { this.revisedDate = revisedDate; }
    public void setRepeatDeferral(boolean repeatDeferral) { this.repeatDeferral = repeatDeferral; }
    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public String getReason() { return reason; }
    public LocalDate getOriginalDate() { return originalDate; }
    public LocalDate getRevisedDate() { return revisedDate; }
    public boolean isRepeatDeferral() { return repeatDeferral; }
    public Instant getCreatedAt() { return createdAt; }
}