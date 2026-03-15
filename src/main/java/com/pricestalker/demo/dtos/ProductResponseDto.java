package com.pricestalker.demo.dtos;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.ProductImage;

import lombok.Data;

@Data
public class ProductResponseDto {
	private String id;
	private List<String> images;
	private String name;
	private String url;
	private int currentPrice;
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
        for (ProductImage img: product.getProductImages()) {
        		dto.images.add(img.getUrl());
        }
        dto.name = product.getName();
        dto.url = product.getUrl();
        dto.currentPrice = product.getCurrentPrice();
        dto.currency = product.getCurrency();
        dto.createdAt = product.getCreatedAt();
        dto.updatedAt = product.getUpdatedAt();
        return dto;
    }
}
