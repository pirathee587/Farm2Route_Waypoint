package com.waypoint.order.service;

public class OutletNotFoundException extends RuntimeException {
    public OutletNotFoundException(String id) {
        super("Outlet not found: " + id);
    }
}
