package com.waypoint.order.repository;

import com.waypoint.order.domain.OrderDeferralEntity;
import java.time.Instant;
import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderDeferralRepository extends JpaRepository<OrderDeferralEntity, UUID> {

    List<OrderDeferralEntity> findByOrderIdOrderByCreatedAtAsc(UUID orderId);

    java.util.Optional<OrderDeferralEntity> findFirstByOrderIdOrderByCreatedAtDesc(UUID orderId);

    @Query("""
        select case when count(d) > 0 then true else false end
        from OrderDeferralEntity d
        join OrderEntity o on o.id = d.orderId
        where o.outletId = :outletId and d.createdAt >= :since
        """)
    boolean existsRecentForOutlet(
        @Param("outletId") String outletId,
        @Param("since") Instant since);
}