package com.pricestalker.api.dto.bookmark;

import java.util.List;

import lombok.Data;

@Data
public class BookmarkRequestDto {
	private String name;
	private List<String> productIds; 
}
