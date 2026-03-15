package com.pricestalker.demo.dtos;

import java.time.LocalDateTime;

import com.pricestalker.demo.entities.PriceHistory;

import lombok.Data;

@Data
public class PriceHistoryResponseDto {
	private String id;
	private String productId;
	private int price;
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
