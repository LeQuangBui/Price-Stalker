package com.pricestalker.api.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.api.config.RabbitConfig;
import com.pricestalker.api.service.ScraperService;
import com.pricestalker.core.event.RoutingKeys;
import com.pricestalker.core.event.ScrapeCompletedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class ScrapeResultListener {
    private final ScraperService scraperService;
    private final ObjectMapper objectMapper;

    public ScrapeResultListener(ScraperService scraperService, ObjectMapper objectMapper) {
        this.scraperService = scraperService;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitConfig.SCRAPE_RESULTS_QUEUE)
    public void onScrapeResult(
        Map<String, Object> payload,
        @Header(AmqpHeaders.RECEIVED_ROUTING_KEY) String routingKey
    ) {
        if (RoutingKeys.SCRAPE_COMPLETED.equals(routingKey)) {
            this.scraperService.handleCompleted(toCompletedEvent(payload));
            return;
        }

        if (RoutingKeys.SCRAPE_FAILED.equals(routingKey)) {
            this.scraperService.handleFailed(payload);
            return;
        }

        throw new IllegalArgumentException("Unsupported scrape result routing key: " + routingKey);
    }

    private ScrapeCompletedEvent toCompletedEvent(Map<String, Object> payload) {
        return new ScrapeCompletedEvent(
                toUuid(payload.get("id")),
                toStringOrNull(payload.get("productId")),
                this.objectMapper.convertValue(payload.get("product"), com.pricestalker.core.dto.ProductExtract.class),
                toInstant(payload.get("completedAt"))
        );
    }

    private UUID toUuid(Object value) {
        if (value == null) return null;
        if (value instanceof UUID uuid) return uuid;
        try {
            return UUID.fromString(value.toString());
        } catch (IllegalArgumentException notAUuid) {
            // Forged/garbage id -> null -> handleCompleted logs + drops it (no poison-message retry loop).
            return null;
        }
    }

    private String toStringOrNull(Object value) {
        return value == null ? null : value.toString();
    }

    private Instant toInstant(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        return Instant.parse(value.toString());
    }
}
