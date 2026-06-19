package com.pricestalker.api.dto.product;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.pricestalker.core.entity.DownloadedImage;
import com.pricestalker.core.entity.Product;

import lombok.Data;

@Data
public class ProductResponseDto {
	private String id;
	private List<String> images;
	private String name;
	private String sku;
	private String url;
	private BigDecimal originalPrice;
	private BigDecimal price;
	private BigDecimal flash_sale_price;
	private String currency;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	
	public ProductResponseDto() {
		this.images = new ArrayList<String>();
	}
	
    public static ProductResponseDto from(Product product) {
		if (product == null) return null;
		ProductResponseDto dto = new ProductResponseDto();
        dto.id = product.getId();
        for (DownloadedImage img: product.getDownloadedImages()) {
        		dto.images.add(img.getUrl());
        }
        dto.name = product.getName();
        dto.url = product.getUrl();
		dto.sku = product.getSku();
		dto.originalPrice = product.getOriginalPrice();
        dto.price = product.getPrice();
		dto.flash_sale_price = product.getFlashSalePrice();
        dto.currency = product.getCurrency();
        dto.createdAt = product.getCreatedAt();
        dto.updatedAt = product.getUpdatedAt();
        return dto;
    }
}
