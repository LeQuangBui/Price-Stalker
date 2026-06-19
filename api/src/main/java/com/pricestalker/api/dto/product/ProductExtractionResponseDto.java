package com.pricestalker.api.dto.product;

import com.pricestalker.core.entity.ProductExtractionRequest;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProductExtractionResponseDto {
    private String requestId;
    private String url;
    private ProductExtractionRequest.Status status;
    private String productId;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;

    public static ProductExtractionResponseDto from(ProductExtractionRequest request) {
        if (request == null) return null;
        ProductExtractionResponseDto dto = new ProductExtractionResponseDto();
        dto.requestId = request.getId();
        dto.url = request.getUrl();
        dto.status = request.getStatus();
        dto.productId = request.getProductId();
        dto.errorMessage = request.getErrorMessage();
        dto.createdAt = request.getCreatedAt();
        dto.updatedAt = request.getUpdatedAt();
        dto.completedAt = request.getCompletedAt();
        return dto;
    }
}
