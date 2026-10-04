package com.waypoint.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "receipt_confirmations", schema = "public")
public class ReceiptConfirmationEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "confirmed_by", nullable = false)
    private String confirmedBy;

    @Column(name = "confirmed_at", nullable = false)
    private Instant confirmedAt;

    @Column(name = "has_discrepancy", nullable = false)
    private boolean discrepancy;

    @PrePersist
    void onCreate() {
        confirmedAt = Instant.now();
    }

    public void setOrderId(UUID orderId) { this.orderId = orderId; }
    public void setConfirmedBy(String confirmedBy) { this.confirmedBy = confirmedBy; }
    public void setDiscrepancy(boolean discrepancy) { this.discrepancy = discrepancy; }
    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public String getConfirmedBy() { return confirmedBy; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public boolean hasDiscrepancy() { return discrepancy; }
}