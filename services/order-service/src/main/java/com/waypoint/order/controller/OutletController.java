package com.waypoint.order.controller;

import com.waypoint.order.dto.OutletResponse;
import com.waypoint.order.service.OutletService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outlets")
public class OutletController {

    private final OutletService outletService;

    public OutletController(OutletService outletService) {
        this.outletService = outletService;
    }

    @GetMapping
    public List<OutletResponse> getAllOutlets() {
        return outletService.getAllOutlets();
    }

    @GetMapping("/{id}")
    public OutletResponse getOutletById(@PathVariable String id) {
        return outletService.getOutletById(id);
    }
}
