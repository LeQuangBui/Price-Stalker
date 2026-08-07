package com.pricestalker.api.dto.auth;

import lombok.Data;

@Data
public class PasswordResetConfirmRequestDto {
    private String token;
    private String newPassword;
}
