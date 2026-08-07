package com.pricestalker.api.dto.auth;

import lombok.Data;

@Data
public class EmailVerificationResendRequestDto {
    private String email;
}
