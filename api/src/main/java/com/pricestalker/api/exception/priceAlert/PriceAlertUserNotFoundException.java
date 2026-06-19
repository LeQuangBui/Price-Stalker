package com.pricestalker.api.exception.priceAlert;

public class PriceAlertUserNotFoundException extends RuntimeException {
    public PriceAlertUserNotFoundException(String userId) {
        super("User not found for price alert: " + userId);
    }
}
