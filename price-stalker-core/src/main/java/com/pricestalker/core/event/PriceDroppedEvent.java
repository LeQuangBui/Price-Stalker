package com.pricestalker.core.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PriceDroppedEvent(UUID id, String alertId, String userId, String productId, BigDecimal oldPrice, BigDecimal newPrice, Instant detectedAt) {
}
