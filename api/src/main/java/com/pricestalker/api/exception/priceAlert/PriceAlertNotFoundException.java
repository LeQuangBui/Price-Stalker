package com.pricestalker.api.exception.priceAlert;

public class PriceAlertNotFoundException extends RuntimeException {
    public PriceAlertNotFoundException(String id) {
        super("Price alert not found: " + id);
    }
}
