package com.pricestalker.api.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import com.pricestalker.api.dto.product.ProductRequestDto;
import com.pricestalker.api.messaging.PriceDropPublisher;
import com.pricestalker.core.dto.ProductExtract;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.Website;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.WebsiteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProductService {
	private final ScraperService scraperService;
	private final PriceHistoryService priceHistoryService;
	private final ProductRepository productRepository;
	private final WebsiteRepository websiteRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final PriceDropPublisher priceDropPublisher;

	public ProductService(
            ScraperService scraperService,
            PriceHistoryService priceHistoryService,
            ProductRepository productRepository,
            WebsiteRepository websiteRepository,
            PriceAlertRepository priceAlertRepository,
            PriceDropPublisher priceDropPublisher
	) {
		this.scraperService = scraperService;
        this.priceHistoryService = priceHistoryService;
        this.productRepository = productRepository;
		this.websiteRepository = websiteRepository;
        this.priceAlertRepository = priceAlertRepository;
        this.priceDropPublisher = priceDropPublisher;
	}

	public void addProduct(ProductRequestDto dto) {
		String url = dto.getUrl();
		if (url == null) return;
		if (this.websiteRepository.findOneByUrl(url) == null) return;
		if (this.productRepository.existsByUrl(url)) return;

		this.scraperService.scrapeUrl(url);
	}

	public Product addProduct(ProductExtract extract) {
        if (extract == null) return null;
		Product product = extract.transform();
		if (product.getName() == null || product.getUrl() == null) return null;
        Product existing = this.productRepository.findFirstByUrl(product.getUrl()).orElse(null);
        if (existing != null) return existing;
		Website w = this.websiteRepository.findOneByUrl(product.getUrl());
		if (w == null) return null;
		product.setWebsite(w);
		Product saved = this.productRepository.save(product);
		this.priceHistoryService.addPriceHistory(product);
        return saved;
	}

	public Product updateProduct(String id, ProductExtract extract) {
        if (extract == null) return null;
		if (extract.getName() == null || extract.getUrl() == null) return null;
		Product product = this.productRepository.findById(id).orElse(null);
		if (product == null) return null;
		if (!Objects.equals(product.getUrl(), extract.getUrl())) return null;
        BigDecimal oldTrackedPrice = resolveTrackedPrice(product);
        BigDecimal newTrackedPrice = resolveTrackedPrice(extract);
		product.setPrice(extract.getPrice());
		product.setOriginalPrice(extract.getOriginalPrice());
		product.setFlashSalePrice(extract.getFlashSalePrice());
		Product saved = this.productRepository.save(product);
		this.priceHistoryService.addPriceHistory(product);
        publishMatchingAlerts(product, oldTrackedPrice, newTrackedPrice);
        return saved;
	}

    private BigDecimal resolveTrackedPrice(Product product) {
        if (product.getFlashSalePrice() != null) return product.getFlashSalePrice();
        if (product.getPrice() != null) return product.getPrice();
        return product.getOriginalPrice();
    }

    private BigDecimal resolveTrackedPrice(ProductExtract extract) {
        if (extract.getFlashSalePrice() != null) return extract.getFlashSalePrice();
        if (extract.getPrice() != null) return extract.getPrice();
        return extract.getOriginalPrice();
    }

    private void publishMatchingAlerts(Product product, BigDecimal oldPrice, BigDecimal newPrice) {
        if (oldPrice == null || newPrice == null || newPrice.compareTo(oldPrice) >= 0) return;

        List<PriceAlert> alerts = this.priceAlertRepository.findAllByProductIdAndActiveTrue(product.getId());
        for (PriceAlert alert : alerts) {
            if (alert.getThresholdPrice() != null && newPrice.compareTo(alert.getThresholdPrice()) <= 0) {
                PriceDroppedEvent event = new PriceDroppedEvent(
                        UUID.randomUUID(),
                        alert.getId(),
                        alert.getUser().getId(),
                        product.getId(),
                        oldPrice,
                        newPrice,
                        Instant.now()
                );
                this.priceDropPublisher.publish(event);
            }
        }
    }

	public Product getProduct(String id) {
		return this.productRepository.findById(id).orElse(null);
	}

	public Page<Product> getAllProducts(Pageable pageable) {
		return this.productRepository.findAll(pageable);
	}

	public Page<Product> searchProduct(String search, Pageable pageable) {
		return this.productRepository.findBySearchText(search, pageable);
	}

	public Page<Product> searchProductByUrl(String url, Pageable pageable) {
		return this.productRepository.findByUrl(url, pageable);
	}

	public Page<Product> searchProductByWebsite(String website, Pageable pageable) {
		return this.productRepository.findByWebsiteNameContainingIgnoreCase(website, pageable);
	}
}
