package com.pricestalker.demo.dtos;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class PriceHistoryRequestDto {
	private String productId;
	private LocalDateTime after;
	private boolean all;
}
