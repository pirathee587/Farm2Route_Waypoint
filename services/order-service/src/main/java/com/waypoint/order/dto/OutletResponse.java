package com.waypoint.order.dto;

import com.waypoint.order.domain.OutletEntity;
import java.math.BigDecimal;

public record OutletResponse(
    String outlet_id,
    String name,
    String district,
    String depot,
    String parking_type,
    BigDecimal lat,
    BigDecimal lng
) {
    public static OutletResponse from(OutletEntity entity) {
        return new OutletResponse(
            entity.getOutletId(),
            entity.getName(),
            entity.getDistrict(),
            entity.getDepot(),
            entity.getParkingType(),
            entity.getLat(),
            entity.getLng()
        );
    }
}
