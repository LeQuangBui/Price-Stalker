package com.pricestalker.api.controller;

import com.pricestalker.api.dto.push.EndpointDto;
import com.pricestalker.api.dto.push.PushSubscriptionRequestDto;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.PushTestEvent;
import com.pricestalker.core.event.RoutingKeys;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.core.util.Hashing;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Web Push subscription management + a test trigger. The api owns subscriptions and the VAPID
 * public key; it never SENDS push (email-service does, off the bus). Approach B.
 */
@RestController
@RequestMapping("/push")
public class PushController {
    /** H8: per-user test-push rate limit (~1/min) so a user can't spam push providers. */
    private static final long TEST_MIN_INTERVAL_MS = 60_000;

    /**
     * SSRF guard: subscribe only accepts https endpoints on a known browser-push host. Without this,
     * an authenticated user could register an internal URL (e.g. the cloud metadata endpoint) and
     * turn the email-service sender into an SSRF probe (response codes leak reachability).
     */
    private static final List<String> ALLOWED_PUSH_HOSTS = List.of(
            "fcm.googleapis.com",          // Chrome / Edge (FCM)
            "push.services.mozilla.com",   // Firefox
            "notify.windows.com",          // Edge / Windows (WNS)
            "web.push.apple.com"           // Safari / Apple
    );

    static boolean isAllowedPushEndpoint(String endpoint) {
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

    private final PushSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final RabbitTemplate rabbitTemplate;
    private final String vapidPublicKey;
    private final ConcurrentHashMap<String, Long> lastTestAt = new ConcurrentHashMap<>();

    public PushController(
            PushSubscriptionRepository subscriptions,
            UserRepository users,
            RabbitTemplate rabbitTemplate,
            @Value("${vapid.public-key:}") String vapidPublicKey
    ) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.rabbitTemplate = rabbitTemplate;
        this.vapidPublicKey = vapidPublicKey;
    }

    @GetMapping("/vapid-public-key")
    public Map<String, String> vapidPublicKey() {
        return Map.of("publicKey", vapidPublicKey);
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<Void> subscribe(@RequestBody PushSubscriptionRequestDto dto, Authentication auth) {
        User user = this.users.findByUsername(auth.getName());
        if (user == null) return ResponseEntity.status(401).build();
        if (dto.getEndpoint() == null || dto.getKeys() == null
                || dto.getKeys().getP256dh() == null || dto.getKeys().getAuth() == null) {
            return ResponseEntity.badRequest().build();
        }
        if (!isAllowedPushEndpoint(dto.getEndpoint())) {
            return ResponseEntity.badRequest().build();   // SSRF guard — not a real browser push host
        }
        String hash = Hashing.sha256Hex(dto.getEndpoint());
        // Upsert by endpoint_hash; (re)assign to the caller — the browser endpoint belongs to
        // whoever is logged in on it (H5). Lookups never cross users for delete.
        PushSubscription sub = this.subscriptions.findByEndpointHash(hash).orElseGet(PushSubscription::new);
        sub.setUser(user);
        sub.setEndpoint(dto.getEndpoint());
        sub.setEndpointHash(hash);
        sub.setP256dh(dto.getKeys().getP256dh());
        sub.setAuth(dto.getKeys().getAuth());
        if (sub.getCreatedAt() == null) sub.setCreatedAt(LocalDateTime.now());
        try {
            this.subscriptions.save(sub);
        } catch (DataIntegrityViolationException raced) {
            // A concurrent first-subscribe for the same endpoint won the unique(endpoint_hash)
            // insert; re-load and update so the call stays idempotent instead of 500ing.
            PushSubscription winner = this.subscriptions.findByEndpointHash(hash).orElseThrow(() -> raced);
            winner.setUser(user);
            winner.setEndpoint(dto.getEndpoint());
            winner.setP256dh(dto.getKeys().getP256dh());
            winner.setAuth(dto.getKeys().getAuth());
            this.subscriptions.save(winner);
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/subscriptions")
    @Transactional
    public ResponseEntity<Void> unsubscribe(@RequestBody EndpointDto dto, Authentication auth) {
        User user = this.users.findByUsername(auth.getName());
        if (user == null) return ResponseEntity.status(401).build();
        if (dto.getEndpoint() == null) return ResponseEntity.badRequest().build();
        // Scoped to the caller (H5): a user can only delete their OWN subscriptions.
        this.subscriptions.deleteByEndpointHashAndUserId(Hashing.sha256Hex(dto.getEndpoint()), user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test")
    public ResponseEntity<Void> sendTest(Authentication auth) {
        User user = this.users.findByUsername(auth.getName());
        if (user == null) return ResponseEntity.status(401).build();
        long now = System.currentTimeMillis();
        Long prev = this.lastTestAt.get(user.getId());
        if (prev != null && now - prev < TEST_MIN_INTERVAL_MS) {
            return ResponseEntity.status(429).build();
        }
        this.lastTestAt.put(user.getId(), now);
        this.rabbitTemplate.convertAndSend(ExchangeNames.MAIN, RoutingKeys.PUSH_TEST,
                new PushTestEvent(user.getId(), Instant.now()));
        return ResponseEntity.accepted().build();
    }
}
