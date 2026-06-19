package com.pricestalker.core.event;

import com.pricestalker.core.dto.ProductExtract;

import java.time.Instant;
import java.util.UUID;

public record ScrapeCompletedEvent(UUID id, String productId, ProductExtract product, Instant completedAt) {
}
