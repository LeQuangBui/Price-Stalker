package com.pricestalker.api.exception.priceAlert;

public class PriceAlertProductNotFoundException extends RuntimeException {
    public PriceAlertProductNotFoundException(String productId) {
        super("Product not found for price alert: " + productId);
    }
}
