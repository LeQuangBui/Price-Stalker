package com.pricestalker.api.exception.priceAlert;

public class DuplicatePriceAlertException extends RuntimeException {
    public DuplicatePriceAlertException(String userId, String productId) {
        super("Price alert already exists for user " + userId + " and product " + productId);
    }
}
