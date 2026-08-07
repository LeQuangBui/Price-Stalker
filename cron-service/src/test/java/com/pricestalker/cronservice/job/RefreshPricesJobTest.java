package com.pricestalker.cronservice.job;

import com.pricestalker.core.entity.Product;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.cronservice.messaging.ScrapeRequestPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshPricesJobTest {
    @Mock
    private ProductRepository productRepository;

    @Mock
    private ScrapeRequestPublisher scrapeRequestPublisher;

    @Test
    void refreshAllProductsPublishesUpdatedScrapeRequestsForRepositoryProducts() {
        Product first = product("product-1", "https://gearvn.com/products/mouse");
        Product second = product("product-2", "https://kccshop.vn/product");
        when(productRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(first, second)));

        RefreshPricesJob job = new RefreshPricesJob(productRepository, scrapeRequestPublisher);

        job.refreshAllProducts();

        ArgumentCaptor<ScrapeRequestedEvent> eventCaptor = ArgumentCaptor.forClass(ScrapeRequestedEvent.class);
        verify(scrapeRequestPublisher, times(2)).publish(eventCaptor.capture());
        assertThat(eventCaptor.getAllValues())
                .extracting(ScrapeRequestedEvent::productId)
                .containsExactly("product-1", "product-2");
        assertThat(eventCaptor.getAllValues())
                .extracting(ScrapeRequestedEvent::url)
                .containsExactly("https://gearvn.com/products/mouse", "https://kccshop.vn/product");
        assertThat(eventCaptor.getAllValues())
                .extracting(ScrapeRequestedEvent::updated)
                .containsExactly(true, true);
    }

    @Test
    void refreshAllProductsPaginatesUntilNoMoreProducts() {
        Product first = product("product-1", "https://gearvn.com/products/mouse");
        Product second = product("product-2", "https://kccshop.vn/product");
        when(productRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first), PageRequest.of(0, 50), 51))
                .thenReturn(new PageImpl<>(List.of(second), PageRequest.of(1, 50), 51));

        RefreshPricesJob job = new RefreshPricesJob(productRepository, scrapeRequestPublisher);

        job.refreshAllProducts();

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository, times(2)).findAll(pageableCaptor.capture());
        assertThat(pageableCaptor.getAllValues()).extracting(Pageable::getPageNumber).containsExactly(0, 1);
        verify(scrapeRequestPublisher, times(2)).publish(any(ScrapeRequestedEvent.class));
    }

    @Test
    void refreshAllProductsUsesStableIdSortForPagination() {
        Product product = product("product-1", "https://gearvn.com/products/mouse");
        when(productRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(product)));

        RefreshPricesJob job = new RefreshPricesJob(productRepository, scrapeRequestPublisher);

        job.refreshAllProducts();

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findAll(pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(50);
        assertThat(pageableCaptor.getValue().getSort().getOrderFor("id")).isNotNull();
    }

    @Test
    void refreshOneProductSkipsMissingUrl() {
        Product product = product("product-1", " ");
        RefreshPricesJob job = new RefreshPricesJob(productRepository, scrapeRequestPublisher);

        job.refreshOneProduct(product);

        verify(scrapeRequestPublisher, never()).publish(any());
    }

    private Product product(String id, String url) {
        Product product = new Product();
        product.setId(id);
        product.setUrl(url);
        return product;
    }
}
