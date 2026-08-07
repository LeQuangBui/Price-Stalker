package com.pricestalker.api.dto.priceAlert;

import jakarta.validation.constraints.Positive;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PriceAlertUpdateRequestDto {
    private String productId;
    private Boolean active;

    // Partial update: only validated when the caller supplies a value.
    @Positive
    private BigDecimal thresholdPrice;
}
