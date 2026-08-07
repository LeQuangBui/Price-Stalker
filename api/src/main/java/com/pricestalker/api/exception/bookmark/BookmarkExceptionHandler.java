package com.pricestalker.api.exception.bookmark;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.Instant;
import java.util.Map;

@ControllerAdvice
public class BookmarkExceptionHandler {

    @ExceptionHandler(BookmarkNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(BookmarkNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "bookmark_not_found", ex.getMessage());
    }

    @ExceptionHandler(BookmarkUserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(BookmarkUserNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "user_not_found", ex.getMessage());
    }

    @ExceptionHandler(BookmarkProductNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotFound(BookmarkProductNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "product_not_found", ex.getMessage());
    }

    @ExceptionHandler(InvalidBookmarkException.class)
    public ResponseEntity<Map<String, Object>> handleInvalid(InvalidBookmarkException ex) {
        return build(HttpStatus.BAD_REQUEST, "invalid_bookmark", ex.getMessage());
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
