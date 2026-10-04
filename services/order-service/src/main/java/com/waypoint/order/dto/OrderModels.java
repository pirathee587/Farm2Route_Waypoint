package com.waypoint.order.dto;
import jakarta.validation.Valid;import jakarta.validation.constraints.*;import java.math.BigDecimal;import java.time.*;import java.util.*;
public final class OrderModels {private OrderModels(){}
 public record PlaceOrderRequest(@NotEmpty List<@Valid ItemRequest> items,@NotNull LocalDate requestedDeliveryDate,String notes){}
 public record ItemRequest(@NotBlank String productCode,@Min(1)int quantity,@DecimalMin("0.001")BigDecimal weightKg,@DecimalMin("0.001")BigDecimal volumeM3,@NotBlank String tempRequirement,@DecimalMin("0")BigDecimal unitPrice){}
 public record PlaceOrderResponse(UUID orderId,String confirmation,String status,LocalDate requestedDeliveryDate){}
 public record TimelineEntry(String status,String detail,Instant occurredAt){}
 public record OrderView(UUID orderId,String outletId,String status,LocalDate requestedDeliveryDate,Instant expectedArrival,String deferralReason,List<Map<String,Object>> items,List<TimelineEntry> timeline){}
 public record ReceiptLine(@NotBlank String productCode,@Min(0)int receivedQty){}
 public record ReceiptRequest(@NotEmpty List<@Valid ReceiptLine> lines){}
 public record IssueRequest(@Pattern(regexp="DAMAGED|SHORT|WRONG")String type,String productCode,@Min(1)Integer quantity,String description,String photoUrl){}
}
