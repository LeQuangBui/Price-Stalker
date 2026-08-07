package com.pricestalker.api.dto.priceHistory;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PriceHistoryRequestDto {
	private String productId;
	private LocalDateTime after;
}
