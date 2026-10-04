package com.waypoint.planning.exception;

public class PlanningException extends RuntimeException {
    private final int status;
    public PlanningException(int status, String message) { super(message); this.status = status; }
    public int status() { return status; }
}
