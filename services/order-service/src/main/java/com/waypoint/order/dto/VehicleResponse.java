package com.waypoint.order.dto;

import com.waypoint.order.domain.VehicleEntity;
import java.math.BigDecimal;

public record VehicleResponse(
    String vehicle_id,
    String registration,
    String type,
    BigDecimal weight_cap_kg,
    BigDecimal volume_cap_m3,
    String temp_capability,
    String depot,
    String brand
) {
    public static VehicleResponse from(VehicleEntity entity) {
        return new VehicleResponse(
            entity.getVehicleId(),
            entity.getRegistration(),
            entity.getType(),
            entity.getWeightCapKg(),
            entity.getVolumeCapM3(),
            entity.getTempCapability(),
            entity.getDepot(),
            entity.getBrand()
        );
    }
}
