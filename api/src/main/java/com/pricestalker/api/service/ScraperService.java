package com.pricestalker.api.service;

import com.pricestalker.api.messaging.ScrapeRequestPublisher;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.ProductExtractionRequest;
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
        // Defense-in-depth (BUS Issue 1): the RabbitMQ bus is internal, but a compromised service
        // could forge a scrape.completed message. The CREATE path below validates the id against a
        // real, still-pending ProductExtractionRequest, so a forged message can't create arbitrary
        // products or reopen a settled request. NOTE: the UPDATE path (productId != null) is NOT
        // validated this way — scheduled cron refreshes legitimately publish no request row — so a
        // forged UPDATE can still re-price an EXISTING product. That residual is bounded by bus network
        // isolation + fail-fast broker creds + the listener alert-consistency check; the full fix (cron
        // persists update-requests, or signed bus messages) is tracked in TODOS.
        if (event.id() == null) {
            log.warn("Dropping scrape.completed with no request id (productId={})", event.productId());
            return;
        }
        String requestId = event.id().toString();
        ProductExtractionRequest request = this.productExtractionService.get(requestId);

        Product product;
        if (event.productId() == null) {
            // CREATE path = a user URL-extraction, which ALWAYS has a pending ProductExtractionRequest.
            // Defense-in-depth (BUS Issue 1): reject a forged scrape.completed with no matching pending
            // request so a compromised bus peer can't create arbitrary products or reopen a settled one.
            ProductExtractionRequest.Status status = request == null ? null : request.getStatus();
            if (status != ProductExtractionRequest.Status.QUEUED
                    && status != ProductExtractionRequest.Status.PROCESSING) {
                log.warn("Dropping scrape.completed (create) for unknown/terminal extraction request id={}", requestId);
                return;
            }
            product = this.productService.addProduct(event.product());
        } else {
            // UPDATE path = a scheduled CRON price refresh (RefreshPricesJob publishes the scrape job
            // WITHOUT creating a ProductExtractionRequest) or a re-extraction. It updates an EXISTING
            // product, so it must NOT require a request row — otherwise every cron refresh is dropped.
            product = this.productService.updateProduct(event.productId(), event.product());
        }

        if (product == null) {
            this.productExtractionService.markFailed(requestId, "Product was not saved");
        } else {
            this.productExtractionService.markCompleted(requestId, product.getId());
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
