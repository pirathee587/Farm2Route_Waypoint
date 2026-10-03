package com.waypoint.order.service;

import com.waypoint.order.dto.OutletResponse;
import com.waypoint.order.repository.OutletRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class OutletService {

    private final OutletRepository outletRepository;

    public OutletService(OutletRepository outletRepository) {
        this.outletRepository = outletRepository;
    }

    public List<OutletResponse> getAllOutlets() {
        return outletRepository.findAll().stream()
            .map(OutletResponse::from)
            .toList();
    }

    public OutletResponse getOutletById(String id) {
        return outletRepository.findById(id)
            .map(OutletResponse::from)
            .orElseThrow(() -> new OutletNotFoundException(id));
    }
}
