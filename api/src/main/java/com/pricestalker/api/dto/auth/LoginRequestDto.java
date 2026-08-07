package com.pricestalker.api.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequestDto {
	@NotBlank
	@Size(max = 100)
	private String username;

	@NotBlank
	@Size(max = 200)
	private String password;
}
