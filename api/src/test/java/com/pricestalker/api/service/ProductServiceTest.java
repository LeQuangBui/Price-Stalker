package com.pricestalker.api.service;

import com.pricestalker.api.messaging.PriceDropPublisher;
import com.pricestalker.core.dto.ProductExtract;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.WebsiteRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductServiceTest {
    private final ScraperService scraperService = mock(ScraperService.class);
    private final PriceHistoryService priceHistoryService = mock(PriceHistoryService.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final WebsiteRepository websiteRepository = mock(WebsiteRepository.class);
    private final PriceAlertRepository priceAlertRepository = mock(PriceAlertRepository.class);
    private final PriceDropPublisher priceDropPublisher = mock(PriceDropPublisher.class);

    private final ProductService productService = new ProductService(
            scraperService,
            priceHistoryService,
            productRepository,
            websiteRepository,
            priceAlertRepository,
            priceDropPublisher
    );

    @Test
    void updateProductPublishesPriceDroppedEventForMatchingActiveAlerts() {
        Product product = new Product();
        product.setId("product-1");
        product.setUrl("https://gearvn.com/products/mouse");
        product.setPrice(BigDecimal.valueOf(100));

        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");
        alert.setUser(user);
        alert.setProduct(product);
        alert.setThresholdPrice(BigDecimal.valueOf(90));

        ProductExtract extract = new ProductExtract();
        extract.setName("Mouse");
        extract.setUrl("https://gearvn.com/products/mouse");
        extract.setPrice(BigDecimal.valueOf(80));
        extract.setCurrency("VND");

        when(productRepository.findById("product-1")).thenReturn(Optional.of(product));
        when(priceAlertRepository.findAllByProductIdAndActiveTrue("product-1")).thenReturn(List.of(alert));

        productService.updateProduct("product-1", extract);

        ArgumentCaptor<PriceDroppedEvent> eventCaptor = ArgumentCaptor.forClass(PriceDroppedEvent.class);
        verify(priceDropPublisher).publish(eventCaptor.capture());
        PriceDroppedEvent event = eventCaptor.getValue();
        assertThat(event.alertId()).isEqualTo("alert-1");
        assertThat(event.userId()).isEqualTo("user-1");
        assertThat(event.productId()).isEqualTo("product-1");
        assertThat(event.oldPrice()).isEqualByComparingTo("100");
        assertThat(event.newPrice()).isEqualByComparingTo("80");
        assertThat(event.detectedAt()).isNotNull();
    }
}
