package com.waypoint.order.controller;

import com.waypoint.order.dto.CreateOrderRequest;
import com.waypoint.order.dto.CreateIssueRequest;
import com.waypoint.order.dto.CreateReceiptRequest;
import com.waypoint.order.dto.IssueResponse;
import com.waypoint.order.dto.OrderResponse;
import com.waypoint.order.dto.DeliveryTrackingResponse;
import com.waypoint.order.dto.OrderDeferralResponse;
import com.waypoint.order.dto.OrderTimelineEntryResponse;
import com.waypoint.order.dto.PagedOrdersResponse;
import com.waypoint.order.dto.ReceiptResponse;
import com.waypoint.order.service.OrderService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import java.util.List;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity.created(URI.create("/api/orders/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable UUID id) {
        return orderService.getOrder(id);
    }

    @PostMapping("/{id}/receipt")
    public ReceiptResponse createReceipt(
        @PathVariable UUID id,
        @Valid @RequestBody CreateReceiptRequest request) {
        return orderService.createReceipt(id, request);
    }

    @PostMapping("/{id}/issues")
    public IssueResponse createIssue(
        @PathVariable UUID id,
        @Valid @RequestBody CreateIssueRequest request) {
        return orderService.createIssue(id, request);
    }

    @GetMapping("/{id}/issues")
    public List<IssueResponse> getIssues(@PathVariable UUID id) {
        return orderService.getIssues(id);
    }

    @GetMapping
    public PagedOrdersResponse listOrders(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return orderService.listOrders(status, search, page, size);
    }

    @GetMapping("/{id}/timeline")
    public List<OrderTimelineEntryResponse> getTimeline(@PathVariable UUID id) {
        return orderService.getTimeline(id);
    }

    @GetMapping("/{id}/deferral")
    public OrderDeferralResponse getLatestDeferral(@PathVariable UUID id) {
        return orderService.getLatestDeferral(id);
    }

    @GetMapping("/{id}/tracking")
    public DeliveryTrackingResponse getLatestTracking(@PathVariable UUID id) {
        return orderService.getLatestTracking(id);
    }
}