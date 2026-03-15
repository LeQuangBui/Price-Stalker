package com.pricestalker.demo.dtos;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.pricestalker.demo.entities.Bookmark;
import com.pricestalker.demo.entities.Product;

import lombok.Data;

@Data
public class BookmarkResponseDto {
	private String id;
	private List<ProductResponseDto> products;
	private String name;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	
	public BookmarkResponseDto() {
		this.products = new ArrayList<ProductResponseDto>();
	}
	
	public static BookmarkResponseDto from(Bookmark bookmark) {
		if (bookmark == null) return null;
		BookmarkResponseDto dto = new BookmarkResponseDto();
		dto.id = bookmark.getId();
		for (Product product: bookmark.getBookmarkedProducts()) {
			dto.products.add(ProductResponseDto.from(product));
		}
		dto.name = bookmark.getName();
		dto.createdAt = bookmark.getCreatedAt();
		dto.updatedAt = bookmark.getUpdatedAt();
		return dto;
	}
}
