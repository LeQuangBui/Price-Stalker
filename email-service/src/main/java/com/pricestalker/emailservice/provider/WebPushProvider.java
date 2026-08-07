package com.pricestalker.emailservice.provider;

import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.concurrent.ExecutionException;

/**
 * Sends one VAPID-signed, RFC-8291-encrypted Web Push via nl.martijndwars:web-push (verified on
 * Java 25, T3 spike). Disabled when VAPID is unconfigured so the service still boots in dev.
 *
 * send() returns the push endpoint's HTTP status so the caller can apply the failure taxonomy:
 *   2xx -> sent · 404/410 -> prune subscription · 4xx -> config/alert · 5xx -> retry.
 * A network failure throws IOException (caller rethrows -> retry/DLQ). A crypto/JWT failure
 * throws IllegalStateException (a VAPID config bug — do NOT retry).
 */
@Component
public class WebPushProvider {
    private static final Logger log = LoggerFactory.getLogger(WebPushProvider.class);

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private final boolean enabled;
    private final PushService pushService;

    public WebPushProvider(
        @Value("${vapid.public-key:}") String publicKey,
        @Value("${vapid.private-key:}") String privateKey,
        @Value("${vapid.subject:}") String subject
    ) {
        this.enabled = publicKey != null && !publicKey.isBlank()
            && privateKey != null && !privateKey.isBlank();
        if (this.enabled) {
            try {
                this.pushService = new PushService(publicKey, privateKey, subject);
            } catch (GeneralSecurityException e) {
                throw new IllegalStateException("Invalid VAPID keys for Web Push", e);
            }
            log.info("web_push enabled");
        } else {
            this.pushService = null;
            log.warn("web_push DISABLED — VAPID keys not configured; price-drop push will not be sent.");
        }
    }

    public boolean isEnabled() {
        return this.enabled;
    }

    public int send(String endpoint, String p256dh, String auth, byte[] payload) throws IOException {
        if (!this.enabled) {
            throw new IllegalStateException("Web Push is disabled (VAPID not configured).");
        }
        try {
            Notification notification = new Notification(endpoint, p256dh, auth, payload);
            HttpResponse response = this.pushService.send(notification, Encoding.AES128GCM);
            return response.getStatusLine().getStatusCode();
        } catch (GeneralSecurityException | JoseException e) {
            throw new IllegalStateException("Web Push crypto/JWT failure (VAPID config bug)", e);
        } catch (ExecutionException e) {
            // The sync send blocks on the async HTTP client's future; a delivery failure surfaces
            // here. Treat as transient -> IOException so the caller releases the claim and retries.
            throw new IOException("Web Push delivery failed", e.getCause() != null ? e.getCause() : e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Web Push send interrupted", e);
        }
    }
}
