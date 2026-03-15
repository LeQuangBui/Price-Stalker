package com.pricestalker.demo.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.pricestalker.demo.dtos.PriceHistoryRequestDto;
import com.pricestalker.demo.entities.PriceHistory;
import com.pricestalker.demo.repositories.PriceHistoryRepository;

@Service
public class PriceHistoryService {
	@Autowired
	private PriceHistoryRepository priceHistoryRepository;
	
	public List<PriceHistory> getPriceHistories(PriceHistoryRequestDto priceHistoryRequestDto) {
		String productId = priceHistoryRequestDto.getProductId();
		if (priceHistoryRequestDto.isAll()) {
			return this.priceHistoryRepository.findAllByProductId(productId);
		} else {
			LocalDateTime after = priceHistoryRequestDto.getAfter();
			return this.priceHistoryRepository.findAllByProductIdAfter(productId, after);
		}
		
	}
}
