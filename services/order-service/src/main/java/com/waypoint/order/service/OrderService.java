package com.waypoint.order.service;

import com.waypoint.order.config.GatewayHeaderAuthenticationFilter.GatewayUserPrincipal;
import com.waypoint.order.domain.OrderEntity;
import com.waypoint.order.domain.OrderItemEntity;
import com.waypoint.order.domain.OrderStatus;
import com.waypoint.order.dto.CreateOrderRequest;
import com.waypoint.order.dto.DeliveryTrackingResponse;
import com.waypoint.order.dto.OrderDeferralResponse;
import com.waypoint.order.dto.OrderResponse;
import com.waypoint.order.dto.OrderSummaryResponse;
import com.waypoint.order.dto.OrderTimelineEntryResponse;
import com.waypoint.order.dto.PagedOrdersResponse;
import com.waypoint.order.domain.DeliveryTrackingStatus;
import com.waypoint.order.domain.IssueReportEntity;
import com.waypoint.order.domain.IssueReportType;
import com.waypoint.order.domain.OrderDeferralEntity;
import com.waypoint.order.domain.ReceiptConfirmationEntity;
import com.waypoint.order.dto.CreateIssueRequest;
import com.waypoint.order.dto.CreateReceiptRequest;
import com.waypoint.order.dto.IssueResponse;
import com.waypoint.order.dto.ReceiptResponse;
import com.waypoint.order.messaging.OrderEventPublisher;
import com.waypoint.order.repository.DeliveryTrackingRepository;
import com.waypoint.order.repository.IssueReportRepository;
import com.waypoint.order.repository.OrderDeferralRepository;
import com.waypoint.order.repository.OrderRepository;
import com.waypoint.order.repository.ReceiptConfirmationRepository;
import com.waypoint.order.repository.UserProfileRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.JoinType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrderService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final UserProfileRepository userProfileRepository;
    private final OrderValidationService validationService;
    private final OrderEventPublisher eventPublisher;
    private final DeliveryTrackingRepository deliveryTrackingRepository;
    private final OrderDeferralRepository orderDeferralRepository;
    private final ReceiptConfirmationRepository receiptConfirmationRepository;
    private final IssueReportRepository issueReportRepository;

    public OrderService(
        OrderRepository orderRepository,
        UserProfileRepository userProfileRepository,
        OrderValidationService validationService,
        OrderEventPublisher eventPublisher,
        DeliveryTrackingRepository deliveryTrackingRepository,
        OrderDeferralRepository orderDeferralRepository,
        ReceiptConfirmationRepository receiptConfirmationRepository,
        IssueReportRepository issueReportRepository) {
        this.orderRepository = orderRepository;
        this.userProfileRepository = userProfileRepository;
        this.validationService = validationService;
        this.eventPublisher = eventPublisher;
        this.deliveryTrackingRepository = deliveryTrackingRepository;
        this.orderDeferralRepository = orderDeferralRepository;
        this.receiptConfirmationRepository = receiptConfirmationRepository;
        this.issueReportRepository = issueReportRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        GatewayUserPrincipal user = authenticatedUser();
        UUID userId = parseUserId(user.userId());
        String outletId = authenticatedOutletId();

        var brand = validationService.parseBrand(request.brand());
        var orderType = validationService.parseOrderType(request.brand(), request.order_type());
        validationService.validateRequestedDate(request.requested_delivery_date());

        var order = new OrderEntity();
        order.setOutletId(outletId);
        order.setBrand(brand);
        order.setOrderType(orderType);
        order.setRequestedDeliveryDate(request.requested_delivery_date());
        order.setPreferredDate(request.requested_delivery_date());
        order.setStatus(OrderStatus.PENDING);
        order.setCreatedByUserId(user.userId());
        order.setCutoffEnforced(true);

        request.items().forEach(itemRequest -> {
            var item = new OrderItemEntity();
            item.setItemName(itemRequest.item_name());
            item.setQuantity(itemRequest.quantity());
            item.setUnit(itemRequest.unit());
            order.addItem(item);
        });

        OrderEntity saved = orderRepository.saveAndFlush(order);
        eventPublisher.publishOrderPlaced(saved);
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID id) {
        return OrderResponse.from(accessibleOrder(id));
    }

    @Transactional(readOnly = true)
    public PagedOrdersResponse listOrders(String status, String search, int page, int size) {
        if (page < 0) {
            throw new OrderValidationException("page must be zero or greater");
        }
        if (size < 1) {
            throw new OrderValidationException("size must be greater than zero");
        }
        size = Math.min(size, 100);
        String outletId = authenticatedOutletId();
        OrderStatus requestedStatus = parseStatus(status);
        String searchTerm = search == null || search.isBlank() ? null : search.trim().toLowerCase();

        Specification<OrderEntity> specification = (root, query, criteriaBuilder) -> {
            query.distinct(true);
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(criteriaBuilder.equal(root.get("outletId"), outletId));
            if (requestedStatus != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), requestedStatus));
            }
            if (searchTerm != null) {
                var item = root.join("items", JoinType.LEFT);
                String pattern = "%" + searchTerm + "%";
                predicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(item.get("itemName")), pattern));
            }
            return criteriaBuilder.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };

        Pageable pageable = PageRequest.of(page, size);
        Page<OrderEntity> results = orderRepository.findAll(specification, pageable);
        return new PagedOrdersResponse(
            results.getContent().stream().map(OrderSummaryResponse::from).toList(),
            results.getNumber(),
            results.getSize(),
            results.getTotalElements(),
            results.getTotalPages());
    }

    @Transactional(readOnly = true)
    public List<OrderTimelineEntryResponse> getTimeline(UUID id) {
        OrderEntity order = accessibleOrder(id);
        List<OrderTimelineEntryResponse> entries = new ArrayList<>();
        entries.add(new OrderTimelineEntryResponse(
            "placed", "PENDING", order.getCreatedAt(), "Order created"));

        deliveryTrackingRepository.findByOrderIdOrderByUpdatedAtAsc(id).stream()
            .map(tracking -> new OrderTimelineEntryResponse(
                trackingEvent(tracking.getStatus()),
                tracking.getStatus().name(),
                tracking.getUpdatedAt(),
                tracking.getSourceNote()))
            .forEach(entries::add);

        orderDeferralRepository.findByOrderIdOrderByCreatedAtAsc(id).stream()
            .map(deferral -> new OrderTimelineEntryResponse(
                "deferred",
                "DEFERRED",
                deferral.getCreatedAt(),
                deferral.getReason()))
            .forEach(entries::add);

        if (order.getStatus() == OrderStatus.DELIVERED
            && entries.stream().noneMatch(entry -> "delivered".equals(entry.event()))) {
            entries.add(new OrderTimelineEntryResponse(
                "delivered", "DELIVERED", order.getUpdatedAt(), "Delivery completed"));
        }
        if (order.getStatus() == OrderStatus.DEFERRED
            && entries.stream().noneMatch(entry -> "deferred".equals(entry.event()))) {
            entries.add(new OrderTimelineEntryResponse(
                "deferred", "DEFERRED", order.getUpdatedAt(), "Order deferred"));
        }
        entries.sort(Comparator.comparing(OrderTimelineEntryResponse::occurred_at));
        return entries;
    }

    @Transactional(readOnly = true)
    public OrderDeferralResponse getLatestDeferral(UUID id) {
        accessibleOrder(id);
        return orderDeferralRepository.findFirstByOrderIdOrderByCreatedAtDesc(id)
            .map(OrderDeferralResponse::from)
            .orElseThrow(() -> new OrderNotFoundException("deferral not found for order: " + id));
    }

    @Transactional(readOnly = true)
    public DeliveryTrackingResponse getLatestTracking(UUID id) {
        accessibleOrder(id);
        return deliveryTrackingRepository.findFirstByOrderIdOrderByUpdatedAtDesc(id)
            .map(DeliveryTrackingResponse::from)
            .orElseThrow(() -> new OrderNotFoundException("tracking not found for order: " + id));
    }

    @Transactional
    public ReceiptResponse createReceipt(UUID id, CreateReceiptRequest request) {
        OrderEntity order = accessibleOrder(id);
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new OrderConflictException("receipt is allowed only for DELIVERED orders");
        }
        if (receiptConfirmationRepository.existsByOrderId(id)) {
            throw new OrderConflictException("receipt already exists for order: " + id);
        }

        var receipt = new ReceiptConfirmationEntity();
        receipt.setOrderId(id);
        receipt.setConfirmedBy(request.confirmed_by());
        receipt.setDiscrepancy(request.has_discrepancy());
        var saved = receiptConfirmationRepository.saveAndFlush(receipt);
        return new ReceiptResponse(
            saved.getId(), saved.getOrderId(), saved.getConfirmedBy(),
            saved.getConfirmedAt(), saved.hasDiscrepancy());
    }

    @Transactional
    public IssueResponse createIssue(UUID id, CreateIssueRequest request) {
        accessibleOrder(id);
        var issue = new IssueReportEntity();
        issue.setOrderId(id);
        issue.setIssueType(parseIssueType(request.issue_type()));
        issue.setDescription(request.description());
        issue.setPhotoUrl(request.photo_url());
        return IssueResponse.from(issueReportRepository.saveAndFlush(issue));
    }

    @Transactional(readOnly = true)
    public List<IssueResponse> getIssues(UUID id) {
        accessibleOrder(id);
        return issueReportRepository.findByOrderIdOrderByReportedAtAsc(id).stream()
            .map(IssueResponse::from)
            .toList();
    }

    public String authenticatedOutletId() {
        GatewayUserPrincipal user = authenticatedUser();
        if (user.outletId() != null && !user.outletId().isBlank()) {
            return user.outletId().trim();
        }

        LOGGER.warn("Trusted gateway request has no outlet claim for user {}; falling back to public.user_profiles",
            user.userId());
        UUID userId = parseUserId(user.userId());
        return userProfileRepository.findOutletIdByUserId(userId)
            .filter(value -> !value.isBlank())
            .orElseThrow(() -> new OrderValidationException(
                "authenticated user has no assigned outlet"));
    }

    private OrderEntity accessibleOrder(UUID id) {
        String outletId = authenticatedOutletId();
        return orderRepository.findById(id)
            .filter(order -> outletId.equals(order.getOutletId()))
            .orElseThrow(() -> new OrderNotFoundException("order not found: " + id));
    }

    private static OrderStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OrderStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new OrderValidationException(
                "status must be one of: PENDING, ALLOCATED, DEFERRED, ATTEMPTED, DELIVERED");
        }
    }

    private static IssueReportType parseIssueType(String value) {
        try {
            return IssueReportType.valueOf(value.trim().toLowerCase());
        } catch (RuntimeException exception) {
            throw new OrderValidationException(
                "issue_type must be one of: missing, damaged, wrong_item, late");
        }
    }

    private static String trackingEvent(DeliveryTrackingStatus status) {
        return switch (status) {
            case allocated -> "allocated";
            case loaded -> "loaded";
            case out_for_delivery -> "out_for_delivery";
            case delivery_attempted -> "delivery_attempted";
            case completed -> "delivered";
        };
    }

    private static GatewayUserPrincipal authenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof GatewayUserPrincipal user)) {
            throw new OrderValidationException("authenticated gateway identity is required");
        }
        return user;
    }

    private static UUID parseUserId(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new OrderValidationException("authenticated user id must be a UUID");
        }
    }
}
