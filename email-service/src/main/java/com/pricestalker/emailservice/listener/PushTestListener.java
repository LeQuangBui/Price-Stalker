package com.pricestalker.emailservice.listener;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.event.PushTestEvent;
import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.emailservice.provider.WebPushProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Sends a canned "it works" push to the caller's own subscriptions when they click "send test".
 * Deliberately does NOT touch notification_log (no claim, no dedup, no product lookup) — a test
 * is not a real notification and must not pollute the bell or the dedup keys (G5/H8).
 */
@Component
public class PushTestListener {
    private static final Logger log = LoggerFactory.getLogger(PushTestListener.class);

    private final PushSubscriptionRepository subscriptions;
    private final WebPushProvider webPushProvider;
    private final ObjectMapper objectMapper;

    public PushTestListener(
        PushSubscriptionRepository subscriptions,
        WebPushProvider webPushProvider,
        ObjectMapper objectMapper
    ) {
        this.subscriptions = subscriptions;
        this.webPushProvider = webPushProvider;
        this.objectMapper = objectMapper;
    }

    // No @Transactional: a test sends blocking HTTP per device, and we must not hold a DB
    // connection across that I/O nor roll back earlier 410-prunes if a later device fails. Each
    // device is best-effort and independent (a test is not a real notification).
    @RabbitListener(queues = QueueNames.PUSH_TEST)
    public void onPushTest(PushTestEvent event) {
        if (!this.webPushProvider.isEnabled()) {
            return;
        }
        List<PushSubscription> subs = this.subscriptions.findByUserId(event.userId());
        if (subs.isEmpty()) {
            log.info("push_test outcome=no-subscriptions userId={}", event.userId());
            return;
        }
        byte[] payload = buildPayload();
        for (PushSubscription sub : subs) {
            try {
                int status = this.webPushProvider.send(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
                if (status == 404 || status == 410) {
                    this.subscriptions.delete(sub);   // prune a dead endpoint (auto-committed per call)
                }
            } catch (IllegalStateException configBug) {
                log.error("push_test config-bug userId={} error={}", event.userId(), configBug.toString());
                // VAPID/payload config bug — don't retry
            } catch (IOException networkFailure) {
                // Best-effort: a transient failure on one device must not retry/DLQ the whole test
                // (which would re-send to the devices that already succeeded). Just log and move on.
                log.warn("push_test transient userId={} error={}", event.userId(), networkFailure.toString());
            }
        }
    }

    private byte[] buildPayload() {
        try {
            return this.objectMapper.writeValueAsBytes(Map.of(
                "title", "Price Stalker",
                "body", "Test notification — your price-drop alerts are working.",
                "url", "/"));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to build test push payload", e);
        }
    }
}
