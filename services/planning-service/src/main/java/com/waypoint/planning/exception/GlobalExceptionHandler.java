package com.waypoint.planning.exception;

import com.waypoint.planning.dto.ApiError;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(PlanningException.class)
    ResponseEntity<ApiError> planning(PlanningException ex) {
        return ResponseEntity.status(ex.status()).body(ApiError.of(ex.status(), HttpStatus.valueOf(ex.status()).getReasonPhrase(), ex.getMessage()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex) {
        Map<String,Object> d = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> d.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ApiError(java.time.Instant.now(),400,"Bad Request","Validation failed",d));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiError> invalid(IllegalArgumentException ex){return ResponseEntity.badRequest().body(ApiError.of(400,"Bad Request",ex.getMessage()));}
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> generic(Exception ex) {
        return ResponseEntity.status(500).body(ApiError.of(500,"Internal Server Error","Unexpected server failure"));
    }
}
