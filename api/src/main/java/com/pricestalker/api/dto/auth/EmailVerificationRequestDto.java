package com.pricestalker.api.dto.auth;

import lombok.Data;

@Data
public class EmailVerificationRequestDto {
    private String email;
    private String code;
}
