package com.pricestalker.api.dto.auth;

import lombok.Data;

@Data
public class PasswordResetRequestDto {
    private String email;
}
