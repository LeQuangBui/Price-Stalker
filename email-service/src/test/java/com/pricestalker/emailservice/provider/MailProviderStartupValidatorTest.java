package com.pricestalker.emailservice.provider;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class MailProviderStartupValidatorTest {

    @Test
    void resendWithApiKeyDoesNotThrow() {
        MailProviderStartupValidator validator = new MailProviderStartupValidator(
                "resend", "no-reply@pricestalker.com", "re_secret", "");

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    void resendWithBlankApiKeyThrows() {
        MailProviderStartupValidator validator = new MailProviderStartupValidator(
                "resend", "no-reply@pricestalker.com", "", "");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("api-key");
    }

    @Test
    void smtpWithHostAndBlankResendKeyDoesNotThrow() {
        MailProviderStartupValidator validator = new MailProviderStartupValidator(
                "smtp", "no-reply@pricestalker.com", "", "postfix");

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    void smtpWithBlankHostThrows() {
        MailProviderStartupValidator validator = new MailProviderStartupValidator(
                "smtp", "no-reply@pricestalker.com", "", "");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.mail.host");
    }

    @Test
    void blankFromThrows() {
        MailProviderStartupValidator validator = new MailProviderStartupValidator(
                "resend", "", "re_secret", "postfix");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("mail.from");
    }
}
