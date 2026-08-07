package com.pricestalker.api.dto.priceAlert;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PriceAlertRequestDto {
    @NotBlank
    private String productId;

    @NotNull
    @Positive
    private BigDecimal thresholdPrice;
}
