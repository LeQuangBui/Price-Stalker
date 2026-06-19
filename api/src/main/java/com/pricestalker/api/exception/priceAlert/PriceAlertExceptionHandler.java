package com.pricestalker.api.exception.priceAlert;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.Instant;
import java.util.Map;

@ControllerAdvice
public class PriceAlertExceptionHandler {

    @ExceptionHandler(DuplicatePriceAlertException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicate(DuplicatePriceAlertException ex) {
        return build(HttpStatus.CONFLICT, "duplicate_price_alert", ex.getMessage());
    }

    @ExceptionHandler(InvalidPriceAlertThresholdException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidThreshold(InvalidPriceAlertThresholdException ex) {
        return build(HttpStatus.BAD_REQUEST, "invalid_threshold", ex.getMessage());
    }

    @ExceptionHandler(PriceAlertNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(PriceAlertNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "price_alert_not_found", ex.getMessage());
    }

    @ExceptionHandler(PriceAlertProductNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotFound(PriceAlertProductNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "product_not_found", ex.getMessage());
    }

    @ExceptionHandler(PriceAlertUserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(PriceAlertUserNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "user_not_found", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String code, String message) {
        Map<String, Object> body = Map.of(
            "timestamp", Instant.now().toString(),
            "status", status.value(),
            "error", code,
            "message", message
        );
        return ResponseEntity.status(status).body(body);
    }
}
