package com.pricestalker.cronservice.job;

import com.pricestalker.core.entity.Product;
import com.pricestalker.core.event.ScrapeRequestedEvent;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.cronservice.messaging.ScrapeRequestPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class RefreshPricesJob {
    private static final Logger log = LoggerFactory.getLogger(RefreshPricesJob.class);
    private static final int PAGE_SIZE = 50;

    private final ProductRepository productRepository;
    private final ScrapeRequestPublisher scrapeRequestPublisher;

    public RefreshPricesJob(ProductRepository productRepository, ScrapeRequestPublisher scrapeRequestPublisher) {
        this.productRepository = productRepository;
        this.scrapeRequestPublisher = scrapeRequestPublisher;
    }

    @Scheduled(cron = "0 0 */3 * * *")
    public void scheduleRefresh() {
        refreshAllProducts();
    }

    public void refreshAllProducts() {
        int pageNumber = 0;
        Page<Product> page;

        do {
            Pageable pageable = PageRequest.of(pageNumber, PAGE_SIZE, Sort.by("id"));
            page = this.productRepository.findAll(pageable);

            page.getContent().forEach(this::refreshOneProduct);
            pageNumber++;
        } while (page.hasNext());
    }

    public void refreshOneProduct(Product product) {
        if (product.getUrl() == null || product.getUrl().isBlank()) {
            log.warn("Skipping scrape request for productId={} because url is missing", product.getId());
            return;
        }

        ScrapeRequestedEvent event = new ScrapeRequestedEvent(
                UUID.randomUUID(),
                true,
                product.getUrl(),
                product.getId()
        );
        this.scrapeRequestPublisher.publish(event);
    }
}
