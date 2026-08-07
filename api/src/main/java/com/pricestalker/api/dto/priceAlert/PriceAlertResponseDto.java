package com.pricestalker.api.dto.priceAlert;

import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.api.dto.product.ProductResponseDto;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PriceAlertResponseDto {
    private String id;
    private ProductResponseDto product;
    private BigDecimal thresholdPrice;
    private Boolean active;

    public static PriceAlertResponseDto from(PriceAlert priceAlert) {
        PriceAlertResponseDto dto = new PriceAlertResponseDto();
        dto.setId(priceAlert.getId());
        dto.setProduct(ProductResponseDto.from(priceAlert.getProduct()));
        dto.setThresholdPrice(priceAlert.getThresholdPrice());
        dto.setActive(priceAlert.getActive());
        return dto;
    }
}
