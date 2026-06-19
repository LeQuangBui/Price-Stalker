package com.pricestalker.emailservice.provider;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MailProviderStartupValidator {
    private final String from;
    private final String resendApiKey;

    public MailProviderStartupValidator(
        @Value("${mail.from:}") String from,
        @Value("${mail.resend.api-key:}") String resendApiKey
    ) {
        this.from = from;
        this.resendApiKey = resendApiKey;
    }

    @PostConstruct
    public void validate() {
        requireText(this.from, "mail.from must be configured with a real sender address.");
        requireText(this.resendApiKey, "mail.resend.api-key must be configured for real email delivery.");
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(message);
        }
    }
}
