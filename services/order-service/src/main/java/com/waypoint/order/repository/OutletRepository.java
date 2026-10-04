package com.waypoint.order.repository;

import com.waypoint.order.domain.OutletEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutletRepository extends JpaRepository<OutletEntity, String> {

    List<OutletEntity> findByDepot(String depot);
}