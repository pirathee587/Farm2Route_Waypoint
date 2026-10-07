package com.waypoint.order.controller;

import com.waypoint.order.dto.OutletResponse;
import com.waypoint.order.service.OutletService;
import com.waypoint.order.service.OrderService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/outlets")
public class OutletController {

    private final OutletService outletService;
    private final OrderService orderService;

    public OutletController(OutletService outletService, OrderService orderService) {
        this.outletService = outletService;
        this.orderService = orderService;
    }

    @GetMapping("/me")
    public OutletResponse getMyOutlet() {
        return outletService.getOutletById(orderService.authenticatedOutletId());
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
