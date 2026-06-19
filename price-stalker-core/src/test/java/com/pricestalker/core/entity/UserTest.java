package com.pricestalker.core.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class UserTest {
    @Test
    void newUserStartsUnverifiedWithNoVerificationOrResetSecrets() {
        User user = new User("hung", "hung@example.com", "hashed-password");

        assertThat(user.isEmailVerified()).isFalse();
        assertThat(user.getEmailVerificationCodeHash()).isNull();
        assertThat(user.getEmailVerificationCodeExpiresAt()).isNull();
        assertThat(user.getPasswordResetTokenHash()).isNull();
        assertThat(user.getPasswordResetTokenExpiresAt()).isNull();
    }
}
