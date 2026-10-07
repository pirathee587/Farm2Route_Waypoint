package com.waypoint.order.controller;

import com.waypoint.order.service.OrderNotFoundException;
import com.waypoint.order.service.OutletNotFoundException;
import com.waypoint.order.service.VehicleNotFoundException;
import com.waypoint.order.service.OrderConflictException;
import com.waypoint.order.service.OrderValidationException;
import com.waypoint.order.service.CutoffPassedException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class OrderExceptionHandler {

    @ExceptionHandler(CutoffPassedException.class)
    ResponseEntity<Map<String, String>> handleCutoff(CutoffPassedException exception) {
        return ResponseEntity.unprocessableEntity()
            .body(Map.of("code", "CUTOFF_PASSED", "error", "Validation failed", "message", exception.getMessage()));
    }

    @ExceptionHandler(OrderConflictException.class)
    ResponseEntity<Map<String, String>> handleConflict(OrderConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", "Conflict", "message", exception.getMessage()));
    }

    @ExceptionHandler(OrderValidationException.class)
    ResponseEntity<Map<String, String>> handleValidation(OrderValidationException exception) {
        return ResponseEntity.unprocessableEntity()
            .body(Map.of("error", "Validation failed", "message", exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> handleRequestValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .orElse("request validation failed");
        return ResponseEntity.unprocessableEntity()
            .body(Map.of("error", "Validation failed", "message", message));
    }

    @ExceptionHandler({OrderNotFoundException.class, OutletNotFoundException.class, VehicleNotFoundException.class})
    ResponseEntity<Map<String, String>> handleNotFound(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", "Not found", "message", exception.getMessage()));
    }
}
