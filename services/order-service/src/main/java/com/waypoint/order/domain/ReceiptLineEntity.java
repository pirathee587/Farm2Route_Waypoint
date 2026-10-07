package com.waypoint.order.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "receipt_items", schema = "public")
public class ReceiptLineEntity {
    @Id @GeneratedValue private UUID id;
    @Column(name = "receipt_id", nullable = false) private UUID receiptId;
    @Column(name = "order_item_id", nullable = false) private UUID orderItemId;
    @Column(name = "expected_qty", nullable = false) private int expectedQty;
    @Column(name = "received_qty", nullable = false) private int receivedQty;
    public void setReceiptId(UUID value) { receiptId = value; }
    public void setOrderItemId(UUID value) { orderItemId = value; }
    public void setExpectedQty(int value) { expectedQty = value; }
    public void setReceivedQty(int value) { receivedQty = value; }
}
