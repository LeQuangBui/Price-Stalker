package com.pricestalker.api.service;

import com.pricestalker.api.messaging.ScrapeRequestPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(OutputCaptureExtension.class)
class ScraperServiceTest {
    private final ScrapeRequestPublisher scrapeRequestPublisher = mock(ScrapeRequestPublisher.class);
    private final ProductService productService = mock(ProductService.class);
    private final ProductExtractionService productExtractionService = mock(ProductExtractionService.class);
    private final ScraperService scraperService = new ScraperService(
            scrapeRequestPublisher,
            productService,
            productExtractionService
    );

    @Test
    void handleFailedLogsFailureContextAndLeavesProductsUnchanged(CapturedOutput output) {
        Map<String, Object> payload = Map.of(
                "id", "request-1",
                "productId", "product-1",
                "url", "https://kccshop.vn/product",
                "error", "blocked"
        );

        scraperService.handleFailed(payload);

        assertThat(output)
                .contains("Scrape failed")
                .contains("request-1")
                .contains("product-1")
                .contains("https://kccshop.vn/product")
                .contains("blocked");
        verifyNoInteractions(productService);
    }
}
