package com.pricestalker.api.dto.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Data;

@Data
public class ProductRequestDto {
	@NotBlank
	@Size(max = 2048)
	private String url;
}
