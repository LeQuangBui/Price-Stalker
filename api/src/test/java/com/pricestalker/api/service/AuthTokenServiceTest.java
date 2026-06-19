package com.pricestalker.api.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class AuthTokenServiceTest {
    private final AuthTokenService service = new AuthTokenService();

    @Test
    void generateEmailVerificationCodeReturnsSixDigits() {
        String code = service.generateEmailVerificationCode();

        assertThat(code).matches("\\d{6}");
    }

    @Test
    void hashProducesStableSha256Value() {
        String first = service.hash("abc123");
        String second = service.hash("abc123");

        assertThat(first).hasSize(64);
        assertThat(second).isEqualTo(first);
        assertThat(service.matches("abc123", first)).isTrue();
        assertThat(service.matches("wrong", first)).isFalse();
    }

    @Test
    void generatePasswordResetTokenReturnsUuidString() {
        String token = service.generatePasswordResetToken();

        assertThat(token).matches("[0-9a-fA-F-]{36}");
    }
}

