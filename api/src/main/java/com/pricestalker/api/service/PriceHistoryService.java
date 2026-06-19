package com.pricestalker.api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.pricestalker.core.entity.PriceHistory;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.repository.PriceHistoryRepository;
import org.springframework.stereotype.Service;

import com.pricestalker.api.dto.priceHistory.PriceHistoryRequestDto;

@Service
public class PriceHistoryService {
	private final PriceHistoryRepository priceHistoryRepository;

	public PriceHistoryService(PriceHistoryRepository priceHistoryRepository) {
		this.priceHistoryRepository = priceHistoryRepository;
	}

	public void addPriceHistory(Product product) {
		BigDecimal price = product.getFlashSalePrice();
		if (price == null) price = product.getPrice();
		if (price == null) price = product.getOriginalPrice();
        if (price == null) return;
		this.priceHistoryRepository.save(new PriceHistory(product, price));
	}

	public List<PriceHistory> getPriceHistories(PriceHistoryRequestDto dto) {
		String productId = dto.getProductId();
		if (dto.getAfter() == null) {
			return this.priceHistoryRepository.findAllByProductIdOrderByRecordedAtAsc(productId);
		} else {
			return this.priceHistoryRepository.findAllByProductIdAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(productId, dto.getAfter());
		}
	}
}
