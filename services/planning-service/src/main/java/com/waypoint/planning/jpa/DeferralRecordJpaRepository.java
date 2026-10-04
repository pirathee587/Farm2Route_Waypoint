package com.waypoint.planning.jpa;
import com.waypoint.planning.entity.DeferralRecordEntity;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface DeferralRecordJpaRepository extends JpaRepository<DeferralRecordEntity,UUID>{Optional<DeferralRecordEntity> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(UUID orderId,String status);List<DeferralRecordEntity> findByDeliveryDateAndStatusOrderByCreatedAtDesc(java.time.LocalDate date,String status);}
