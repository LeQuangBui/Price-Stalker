package com.pricestalker.api.exception.priceAlert;

import java.math.BigDecimal;

public class InvalidPriceAlertThresholdException extends RuntimeException {
    public InvalidPriceAlertThresholdException(BigDecimal threshold) {
        super("Invalid threshold price: " + threshold + " (must be non-negative)");
    }
}
