package com.waypoint.order.repository;

import com.waypoint.order.domain.VehicleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<VehicleEntity, String> {
}