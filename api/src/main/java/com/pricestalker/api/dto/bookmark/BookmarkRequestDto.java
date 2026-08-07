package com.pricestalker.api.dto.bookmark;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Data;

@Data
public class BookmarkRequestDto {
	@NotBlank
	@Size(max = 255)
	private String name;

	// Cap the collection so an attacker-sized body cannot drive unbounded work / memory.
	@Size(max = 1000)
	private List<String> productIds;
}
