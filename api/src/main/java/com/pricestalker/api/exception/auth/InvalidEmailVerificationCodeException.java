package com.pricestalker.api.exception.auth;

public class InvalidEmailVerificationCodeException extends RuntimeException {
    public InvalidEmailVerificationCodeException(String message) {
        super(message);
    }
}
