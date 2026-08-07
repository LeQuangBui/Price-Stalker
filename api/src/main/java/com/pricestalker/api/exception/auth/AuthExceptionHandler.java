package com.pricestalker.api.exception.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.pricestalker.api.controller.AuthController;

import java.time.Instant;
import java.util.Map;

// Scoped to AuthController only: the catch-all IllegalArgumentException -> 400 below must NOT swallow
// IllegalArgumentExceptions from unrelated controllers (product/extraction/scrape), which would mask
// real server faults as "invalid_auth_request" 400s.
@ControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return build(HttpStatus.UNAUTHORIZED, "invalid_credentials", ex.getMessage());
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<Map<String, Object>> handleEmailNotVerified(EmailNotVerifiedException ex) {
        return build(HttpStatus.FORBIDDEN, "email_not_verified", ex.getMessage());
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleEmailAlreadyExists(EmailAlreadyExistsException ex) {
        return build(HttpStatus.BAD_REQUEST, "email_already_exists", ex.getMessage());
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleUsernameAlreadyExists(UsernameAlreadyExistsException ex) {
        return build(HttpStatus.BAD_REQUEST, "username_already_exists", ex.getMessage());
    }

    @ExceptionHandler(InvalidEmailVerificationCodeException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidEmailVerificationCode(InvalidEmailVerificationCodeException ex) {
        return build(HttpStatus.BAD_REQUEST, "invalid_email_verification_code", ex.getMessage());
    }

    @ExceptionHandler(InvalidPasswordResetTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPasswordResetToken(InvalidPasswordResetTokenException ex) {
        return build(HttpStatus.BAD_REQUEST, "invalid_password_reset_token", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST, "invalid_auth_request", ex.getMessage());
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
