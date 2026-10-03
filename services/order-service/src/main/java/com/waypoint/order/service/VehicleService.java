package com.waypoint.order.service;

import com.waypoint.order.dto.VehicleResponse;
import com.waypoint.order.repository.VehicleRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    public List<VehicleResponse> getAllVehicles() {
        return vehicleRepository.findAll().stream()
            .map(VehicleResponse::from)
            .toList();
    }

    public VehicleResponse getVehicleById(String id) {
        return vehicleRepository.findById(id)
            .map(VehicleResponse::from)
            .orElseThrow(() -> new VehicleNotFoundException(id));
    }
}
