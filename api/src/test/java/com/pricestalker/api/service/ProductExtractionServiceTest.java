package com.pricestalker.api.service;

import com.pricestalker.api.messaging.ScrapeRequestPublisher;
import com.pricestalker.core.entity.ProductExtractionRequest;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import com.pricestalker.core.repository.ProductExtractionRequestRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductExtractionServiceTest {
    private final ProductExtractionRequestRepository requestRepository = mock(ProductExtractionRequestRepository.class);
    private final ScrapeRequestPublisher scrapeRequestPublisher = mock(ScrapeRequestPublisher.class);
    private final ProductExtractionService productExtractionService = new ProductExtractionService(
            requestRepository,
            scrapeRequestPublisher
    );

    @Test
    void createQueuesExtractionAndPublishesScrapeRequestWithSameId() {
        when(requestRepository.save(org.mockito.ArgumentMatchers.any(ProductExtractionRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductExtractionRequest request = productExtractionService.create(" https://gearvn.com/products/mouse ", "user-1");

        ArgumentCaptor<ProductExtractionRequest> requestCaptor = ArgumentCaptor.forClass(ProductExtractionRequest.class);
        ArgumentCaptor<ScrapeRequestedEvent> eventCaptor = ArgumentCaptor.forClass(ScrapeRequestedEvent.class);
        verify(requestRepository).save(requestCaptor.capture());
        verify(scrapeRequestPublisher).publish(eventCaptor.capture());

        ProductExtractionRequest saved = requestCaptor.getValue();
        ScrapeRequestedEvent event = eventCaptor.getValue();
        assertThat(request.getId()).isEqualTo(saved.getId());
        assertThat(saved.getStatus()).isEqualTo(ProductExtractionRequest.Status.QUEUED);
        assertThat(saved.getUrl()).isEqualTo("https://gearvn.com/products/mouse");
        assertThat(saved.getUserId()).isEqualTo("user-1");
        assertThat(event.id().toString()).isEqualTo(saved.getId());
        assertThat(event.updated()).isFalse();
        assertThat(event.url()).isEqualTo(saved.getUrl());
        assertThat(event.productId()).isNull();
    }

    @Test
    void markCompletedStoresProductIdAndCompletionTime() {
        ProductExtractionRequest request = new ProductExtractionRequest();
        request.setId("11111111-1111-1111-1111-111111111111");
        request.setUrl("https://gearvn.com/products/mouse");
        request.setStatus(ProductExtractionRequest.Status.QUEUED);
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(requestRepository.save(org.mockito.ArgumentMatchers.any(ProductExtractionRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductExtractionRequest completed = productExtractionService.markCompleted(request.getId(), "product-1");

        assertThat(completed.getStatus()).isEqualTo(ProductExtractionRequest.Status.COMPLETED);
        assertThat(completed.getProductId()).isEqualTo("product-1");
        assertThat(completed.getCompletedAt()).isNotNull();
    }

    @Test
    void markFailedStoresErrorMessageAndCompletionTime() {
        ProductExtractionRequest request = new ProductExtractionRequest();
        request.setId("11111111-1111-1111-1111-111111111111");
        request.setUrl("https://gearvn.com/products/mouse");
        request.setStatus(ProductExtractionRequest.Status.QUEUED);
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(requestRepository.save(org.mockito.ArgumentMatchers.any(ProductExtractionRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductExtractionRequest failed = productExtractionService.markFailed(request.getId(), "blocked");

        assertThat(failed.getStatus()).isEqualTo(ProductExtractionRequest.Status.FAILED);
        assertThat(failed.getErrorMessage()).isEqualTo("blocked");
        assertThat(failed.getCompletedAt()).isNotNull();
    }
}
