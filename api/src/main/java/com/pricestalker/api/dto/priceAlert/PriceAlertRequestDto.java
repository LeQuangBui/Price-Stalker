package com.pricestalker.api.dto.priceAlert;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PriceAlertRequestDto {
    private String productId;
    private BigDecimal thresholdPrice;
}
