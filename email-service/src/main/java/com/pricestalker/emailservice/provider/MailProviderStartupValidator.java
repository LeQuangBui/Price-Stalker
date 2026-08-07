package com.pricestalker.emailservice.provider;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Fails fast at startup on a misconfigured mail provider, branching on {@code mail.provider}:
 *  - always require {@code mail.from} (a real sender address is needed for any provider)
 *  - {@code resend}: require {@code mail.resend.api-key}
 *  - {@code smtp}:   require {@code spring.mail.host} (otherwise no JavaMailSender exists)
 *
 * Note: this only checks for non-blank values, not placeholder sanity — a placeholder still
 * boots and fails at send time. Kept as-is from the original behavior.
 */
@Component
public class MailProviderStartupValidator {
    private final String provider;
    private final String from;
    private final String resendApiKey;
    private final String smtpHost;

    public MailProviderStartupValidator(
        @Value("${mail.provider:resend}") String provider,
        @Value("${mail.from:}") String from,
        @Value("${mail.resend.api-key:}") String resendApiKey,
        @Value("${spring.mail.host:}") String smtpHost
    ) {
        this.provider = provider;
        this.from = from;
        this.resendApiKey = resendApiKey;
        this.smtpHost = smtpHost;
    }

    @PostConstruct
    public void validate() {
        requireText(this.from, "mail.from must be configured with a real sender address.");
        if ("smtp".equalsIgnoreCase(this.provider)) {
            requireText(this.smtpHost, "spring.mail.host must be set when mail.provider=smtp (e.g. SMTP_HOST=postfix).");
        } else if ("resend".equalsIgnoreCase(this.provider)) {
            requireText(this.resendApiKey, "mail.resend.api-key must be configured for real email delivery.");
        } else {
            // Fail fast on a typo'd provider (e.g. "smpt") instead of silently routing through Resend.
            throw new IllegalStateException(
                "mail.provider must be 'smtp' or 'resend' (got: '" + this.provider + "').");
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(message);
        }
    }
}
