package com.pricestalker.api.dto.priceAlert;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PriceAlertUpdateRequestDto {
    private String productId;
    private Boolean active;
    private BigDecimal thresholdPrice;
}
