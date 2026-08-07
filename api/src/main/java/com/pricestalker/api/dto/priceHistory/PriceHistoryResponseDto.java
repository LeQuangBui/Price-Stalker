package com.pricestalker.api.dto.priceHistory;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.pricestalker.core.entity.PriceHistory;
import lombok.Data;

@Data
public class PriceHistoryResponseDto {
	private String id;
	private String productId;
	private BigDecimal price;
	private LocalDateTime recordedAt;
	
	public static PriceHistoryResponseDto from(PriceHistory priceHistory) {
		PriceHistoryResponseDto dto = new PriceHistoryResponseDto();
		dto.setId(priceHistory.getId());
		dto.setProductId(priceHistory.getProduct().getId());
		dto.setPrice(priceHistory.getPrice());
		dto.setRecordedAt(priceHistory.getRecordedAt());
		return dto;
	}
}
