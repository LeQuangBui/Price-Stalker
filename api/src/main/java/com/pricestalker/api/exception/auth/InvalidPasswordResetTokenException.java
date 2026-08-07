package com.pricestalker.api.exception.auth;

public class InvalidPasswordResetTokenException extends RuntimeException {
    public InvalidPasswordResetTokenException(String message) {
        super(message);
    }
}
