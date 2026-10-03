package com.waypoint.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "issue_reports", schema = "public")
public class IssueReportEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "issue_type", nullable = false, columnDefinition = "issue_report_type")
    private IssueReportType issueType;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "reported_at", nullable = false, updatable = false)
    private Instant reportedAt;

    @PrePersist
    void onCreate() {
        reportedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }
    public void setIssueType(IssueReportType issueType) { this.issueType = issueType; }
    public void setDescription(String description) { this.description = description; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public IssueReportType getIssueType() { return issueType; }
    public String getDescription() { return description; }
    public String getPhotoUrl() { return photoUrl; }
    public Instant getReportedAt() { return reportedAt; }
}