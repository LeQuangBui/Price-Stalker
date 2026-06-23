package com.pricestalker.emailservice.provider;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Fails fast at startup on a half-configured Web Push setup (eng-review critical gap): if a VAPID
 * public key is set, the private key and subject MUST be too — otherwise every push would fail
 * silently forever ("no pushes ever"). If no public key is set, push is intentionally disabled
 * (dev) and we only log it. Mirrors MailProviderStartupValidator.
 */
@Component
public class PushStartupValidator {
    private static final Logger log = LoggerFactory.getLogger(PushStartupValidator.class);

    private final String publicKey;
    private final String privateKey;
    private final String subject;

    public PushStartupValidator(
        @Value("${vapid.public-key:}") String publicKey,
        @Value("${vapid.private-key:}") String privateKey,
        @Value("${vapid.subject:}") String subject
    ) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.subject = subject;
    }

    @PostConstruct
    public void validate() {
        if (this.publicKey == null || this.publicKey.isBlank()) {
            log.warn("web_push disabled — VAPID_PUBLIC_KEY not set; price-drop push notifications are OFF.");
            return;
        }
        require(this.privateKey, "VAPID_PRIVATE_KEY must be set when VAPID_PUBLIC_KEY is (push would silently fail otherwise).");
        require(this.subject, "VAPID_SUBJECT (a mailto: or https: subject) must be set when push is enabled.");
    }

    private void require(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(message);
        }
    }
}
