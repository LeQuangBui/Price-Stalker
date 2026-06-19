package com.pricestalker.core.event;

import com.pricestalker.core.dto.ProductExtract;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class EventContractTest {
    @Test
    void authEmailRoutingKeysMatchExpectedContracts() {
        assertThat(RoutingKeys.ALERT_EMAIL_WELCOME).isEqualTo("alert.email.welcome");
        assertThat(RoutingKeys.ALERT_EMAIL_VERIFICATION).isEqualTo("alert.email.verification");
        assertThat(RoutingKeys.ALERT_EMAIL_PASSWORD_RESET).isEqualTo("alert.email.password-reset");
    }

    @Test
    void scrapeRoutingKeysMatchExpectedContracts() {
        assertThat(RoutingKeys.SCRAPE_REQUESTED).isEqualTo("scrape.requested");
        assertThat(RoutingKeys.SCRAPE_COMPLETED).isEqualTo("scrape.completed");
        assertThat(RoutingKeys.SCRAPE_FAILED).isEqualTo("scrape.failed");
    }

    @Test
    void scrapeRequestedEventCarriesCreateAndRefreshContracts() {
        UUID createId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        ScrapeRequestedEvent create = new ScrapeRequestedEvent(
                createId,
                false,
                "https://gearvn.com/products/mouse",
                null
        );

        assertThat(create.id()).isEqualTo(createId);
        assertThat(create.updated()).isFalse();
        assertThat(create.url()).isEqualTo("https://gearvn.com/products/mouse");
        assertThat(create.productId()).isNull();

        UUID refreshId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        ScrapeRequestedEvent refresh = new ScrapeRequestedEvent(
                refreshId,
                true,
                "https://kccshop.vn/product",
                "product-123"
        );

        assertThat(refresh.id()).isEqualTo(refreshId);
        assertThat(refresh.updated()).isTrue();
        assertThat(refresh.url()).isEqualTo("https://kccshop.vn/product");
        assertThat(refresh.productId()).isEqualTo("product-123");
    }

    @Test
    void scrapeCompletedEventCarriesSingleProductResult() {
        UUID eventId = UUID.fromString("44444444-4444-4444-4444-444444444444");
        Instant completedAt = Instant.parse("2026-04-28T00:00:00Z");
        ProductExtract product = new ProductExtract();
        product.setUrl("https://kccshop.vn/product");
        product.setName("Mouse");
        product.setPrice(BigDecimal.valueOf(100));
        product.setCurrency("AUD");

        ScrapeCompletedEvent event = new ScrapeCompletedEvent(
                eventId,
                "product-123",
                product,
                completedAt
        );

        assertThat(event.id()).isEqualTo(eventId);
        assertThat(event.productId()).isEqualTo("product-123");
        assertThat(event.product().getUrl()).isEqualTo("https://kccshop.vn/product");
        assertThat(event.product().getName()).isEqualTo("Mouse");
        assertThat(event.product().getPrice()).isEqualByComparingTo("100");
        assertThat(event.product().getCurrency()).isEqualTo("AUD");
        assertThat(event.completedAt()).isEqualTo(completedAt);
    }

    @Test
    void alertEmailEventCarriesTemplateVariablesAndUserId() {
        UUID eventId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        Instant requestedAt = Instant.parse("2026-04-25T00:00:00Z");
        Map<String, Object> vars = Map.of(
                "verificationCode", "123456",
                "expiresInMinutes", 15
        );

        AlertEmailEvent event = new AlertEmailEvent(
                eventId,
                "user-123",
                "email-verification",
                vars,
                requestedAt
        );

        assertThat(event.id()).isEqualTo(eventId);
        assertThat(event.userId()).isEqualTo("user-123");
        assertThat(event.template()).isEqualTo("email-verification");
        assertThat(event.vars()).containsEntry("verificationCode", "123456");
        assertThat(event.vars()).containsEntry("expiresInMinutes", 15);
        assertThat(event.requestedAt()).isEqualTo(requestedAt);
    }
}
