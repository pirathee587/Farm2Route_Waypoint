package com.waypoint.order.service;

public class VehicleNotFoundException extends RuntimeException {
    public VehicleNotFoundException(String id) {
        super("Vehicle not found: " + id);
    }
}
