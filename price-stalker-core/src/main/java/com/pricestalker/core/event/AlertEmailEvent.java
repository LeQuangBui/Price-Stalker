package com.pricestalker.core.event;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AlertEmailEvent(UUID id, String userId, String template, Map<String, Object> vars, Instant requestedAt) {
}
