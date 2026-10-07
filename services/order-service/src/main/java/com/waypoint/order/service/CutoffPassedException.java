package com.waypoint.order.service;

public class CutoffPassedException extends OrderValidationException {
    public CutoffPassedException(String message) {
        super(message);
    }
}
