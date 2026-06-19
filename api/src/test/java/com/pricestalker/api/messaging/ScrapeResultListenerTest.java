package com.pricestalker.api.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.api.config.RabbitConfig;
import com.pricestalker.api.service.ScraperService;
import com.pricestalker.core.event.ScrapeCompletedEvent;
import com.pricestalker.core.event.RoutingKeys;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

import java.math.BigDecimal;
import java.lang.reflect.Method;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ScrapeResultListenerTest {
    private final ScraperService scraperService = mock(ScraperService.class);
    private final ScrapeResultListener listener = new ScrapeResultListener(
            scraperService,
            new ObjectMapper().findAndRegisterModules()
    );

    @Test
    void listenerUsesApiScrapeResultsQueue() throws NoSuchMethodException {
        Method method = ScrapeResultListener.class.getMethod("onScrapeResult", Map.class, String.class);

        RabbitListener annotation = method.getAnnotation(RabbitListener.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.queues()).containsExactly(RabbitConfig.SCRAPE_RESULTS_QUEUE);
    }

    @Test
    void completedMessageIsDelegatedToCompletedHandler() {
        Map<String, Object> payload = Map.of(
                "id", "11111111-1111-1111-1111-111111111111",
                "productId", "product-1",
                "product", Map.of(
                        "url", "https://gearvn.com/products/mouse",
                        "name", "Mouse",
                        "price", BigDecimal.valueOf(80),
                        "currency", "VND"
                ),
                "completedAt", "2026-04-28T00:00:00Z"
        );

        listener.onScrapeResult(payload, RoutingKeys.SCRAPE_COMPLETED);

        ArgumentCaptor<ScrapeCompletedEvent> eventCaptor = ArgumentCaptor.forClass(ScrapeCompletedEvent.class);
        verify(scraperService).handleCompleted(eventCaptor.capture());
        ScrapeCompletedEvent event = eventCaptor.getValue();
        assertThat(event.productId()).isEqualTo("product-1");
        assertThat(event.product().getName()).isEqualTo("Mouse");
        assertThat(event.product().getPrice()).isEqualByComparingTo("80");
    }

    @Test
    void failedMessageIsDelegatedToFailedHandler() {
        Map<String, Object> payload = Map.of(
                "id", "request-1",
                "productId", "product-1",
                "error", "blocked"
        );

        listener.onScrapeResult(payload, RoutingKeys.SCRAPE_FAILED);

        verify(scraperService).handleFailed(payload);
    }

    @Test
    void unsupportedRoutingKeyIsRejected() {
        assertThatThrownBy(() -> listener.onScrapeResult(Map.of(), "scrape.unknown"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported scrape result routing key");
    }
}
