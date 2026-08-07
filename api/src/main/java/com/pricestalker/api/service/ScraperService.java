package com.pricestalker.api.service;

import com.pricestalker.api.messaging.ScrapeRequestPublisher;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.event.ScrapeCompletedEvent;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class ScraperService {
    private static final Logger log = LoggerFactory.getLogger(ScraperService.class);

    private final ScrapeRequestPublisher scrapeRequestPublisher;
    private final ProductService productService;
    private final ProductExtractionService productExtractionService;

    public ScraperService(
            ScrapeRequestPublisher scrapeRequestPublisher,
            @Lazy ProductService productService,
            ProductExtractionService productExtractionService
    ) {
        this.scrapeRequestPublisher = scrapeRequestPublisher;
        this.productService = productService;
        this.productExtractionService = productExtractionService;
    }

    public void scrapeUrl(String url) {
        scrapeUrl(UUID.randomUUID(), url);
    }

    public void scrapeUrl(UUID requestId, String url) {
        ScrapeRequestedEvent event = new ScrapeRequestedEvent(
                requestId,
                false,
                url,
                null
        );
        this.scrapeRequestPublisher.publish(event);
    }

    public void handleCompleted(ScrapeCompletedEvent event) {
        Product product;
        if (event.productId() == null) {
            product = this.productService.addProduct(event.product());
        } else {
            product = this.productService.updateProduct(event.productId(), event.product());
        }

        if (event.id() == null) return;
        if (product == null) {
            this.productExtractionService.markFailed(event.id().toString(), "Product was not saved");
        } else {
            this.productExtractionService.markCompleted(event.id().toString(), product.getId());
        }
    }

    public void handleFailed(Map<String, Object> payload) {
        log.warn(
                "Scrape failed id={} updated={} url={} productId={} error={}",
                payload.get("id"),
                payload.get("updated"),
                payload.get("url"),
                payload.get("productId"),
                payload.getOrDefault("error", "unknown")
        );
        Object id = payload.get("id");
        if (id != null) {
            this.productExtractionService.markFailed(id.toString(), payload.getOrDefault("error", "unknown").toString());
        }
    }
}
