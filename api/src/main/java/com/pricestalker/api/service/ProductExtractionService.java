package com.pricestalker.api.service;

import com.pricestalker.api.messaging.ScrapeRequestPublisher;
import com.pricestalker.core.entity.ProductExtractionRequest;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import com.pricestalker.core.repository.ProductExtractionRequestRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ProductExtractionService {
    private final ProductExtractionRequestRepository requestRepository;
    private final ScrapeRequestPublisher scrapeRequestPublisher;

    public ProductExtractionService(
            ProductExtractionRequestRepository requestRepository,
            ScrapeRequestPublisher scrapeRequestPublisher
    ) {
        this.requestRepository = requestRepository;
        this.scrapeRequestPublisher = scrapeRequestPublisher;
    }

    public ProductExtractionRequest create(String rawUrl, String userId) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("URL is required");
        }

        String url = rawUrl.trim();
        UUID requestId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        ProductExtractionRequest request = new ProductExtractionRequest();
        request.setId(requestId.toString());
        request.setUrl(url);
        request.setUserId(userId);
        request.setStatus(ProductExtractionRequest.Status.QUEUED);
        request.setCreatedAt(now);
        request.setUpdatedAt(now);

        ProductExtractionRequest saved = this.requestRepository.save(request);
        this.scrapeRequestPublisher.publish(new ScrapeRequestedEvent(
                requestId,
                false,
                url,
                null
        ));
        return saved;
    }

    public ProductExtractionRequest get(String requestId) {
        if (requestId == null || requestId.isBlank()) return null;
        return this.requestRepository.findById(requestId).orElse(null);
    }

    public ProductExtractionRequest markCompleted(String requestId, String productId) {
        ProductExtractionRequest request = get(requestId);
        if (request == null) return null;

        LocalDateTime now = LocalDateTime.now();
        request.setStatus(ProductExtractionRequest.Status.COMPLETED);
        request.setProductId(productId);
        request.setErrorMessage(null);
        request.setCompletedAt(now);
        request.setUpdatedAt(now);
        return this.requestRepository.save(request);
    }

    public ProductExtractionRequest markFailed(String requestId, String errorMessage) {
        ProductExtractionRequest request = get(requestId);
        if (request == null) return null;

        LocalDateTime now = LocalDateTime.now();
        request.setStatus(ProductExtractionRequest.Status.FAILED);
        request.setErrorMessage(errorMessage == null || errorMessage.isBlank() ? "Scrape failed" : errorMessage);
        request.setCompletedAt(now);
        request.setUpdatedAt(now);
        return this.requestRepository.save(request);
    }
}
