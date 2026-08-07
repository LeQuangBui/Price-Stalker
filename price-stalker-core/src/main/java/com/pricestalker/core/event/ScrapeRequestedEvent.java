package com.pricestalker.core.event;

import java.util.UUID;

public record ScrapeRequestedEvent(UUID id, Boolean updated, String url, String productId) {
}
