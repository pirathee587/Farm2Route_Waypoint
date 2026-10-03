package com.waypoint.order.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateIssueRequest(
    @NotBlank String issue_type,
    @NotBlank String description,
    String photo_url
) {
}