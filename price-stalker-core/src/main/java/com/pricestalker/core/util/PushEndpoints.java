package com.pricestalker.core.util;

import java.net.URI;
import java.util.List;
import java.util.Locale;

/**
 * SSRF allowlist for Web Push endpoints, shared by the api (rejects bad endpoints at subscribe
 * time) and email-service (defense-in-depth: re-validates the stored endpoint before the outbound
 * POST). A push endpoint must be https and on a known browser-push host (or a subdomain of one);
 * without this an authenticated user could register an internal URL (e.g. the cloud metadata
 * endpoint) and turn the sender into an SSRF probe (response codes leak reachability).
 */
public final class PushEndpoints {
    private PushEndpoints() {}

    private static final List<String> ALLOWED_PUSH_HOSTS = List.of(
            "fcm.googleapis.com",          // Chrome / Edge (FCM)
            "push.services.mozilla.com",   // Firefox
            "notify.windows.com",          // Edge / Windows (WNS)
            "web.push.apple.com"           // Safari / Apple
    );

    public static boolean isAllowed(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return false; // URI.create(null) NPEs; bad stored data must fail closed, not crash the sender.
        }
        final URI uri;
        try {
            uri = URI.create(endpoint);
        } catch (IllegalArgumentException malformed) {
            return false;
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            return false;
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        for (String allowed : ALLOWED_PUSH_HOSTS) {
            if (host.equals(allowed) || host.endsWith("." + allowed)) {
                return true;
            }
        }
        return false;
    }
}
