package com.waypoint.order.dto;

import com.waypoint.order.domain.IssueReportEntity;
import java.time.Instant;
import java.util.UUID;

public record IssueResponse(
    UUID id,
    UUID order_id,
    String issue_type,
    String description,
    String photo_url,
    Instant reported_at
) {
    public static IssueResponse from(IssueReportEntity issue) {
        return new IssueResponse(
            issue.getId(),
            issue.getOrderId(),
            issue.getIssueType().name(),
            issue.getDescription(),
            issue.getPhotoUrl(),
            issue.getReportedAt());
    }
}