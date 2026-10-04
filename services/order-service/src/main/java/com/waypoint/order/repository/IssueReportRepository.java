package com.waypoint.order.repository;

import com.waypoint.order.domain.IssueReportEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IssueReportRepository extends JpaRepository<IssueReportEntity, UUID> {

    List<IssueReportEntity> findByOrderIdOrderByReportedAtAsc(UUID orderId);
}