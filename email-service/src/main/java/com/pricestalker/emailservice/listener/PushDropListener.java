package com.pricestalker.emailservice.listener;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.core.util.Hashing;
import com.pricestalker.emailservice.outbox.PushOutbox;
import com.pricestalker.emailservice.provider.WebPushProvider;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Second consumer off {@code price.dropped} (alongside the email listener): sends a web push per
 * subscription via {@link PushOutbox} (claim-before-send, per device). Each push logs to
 * notification_log with Channel.PUSH and the drop's event_id so the in-app bell can dedup.
 */
@Component
public class PushDropListener {
    private final PushSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final ProductRepository products;
    private final PriceAlertRepository alerts;
    private final WebPushProvider webPushProvider;
    private final PushOutbox pushOutbox;
    private final ObjectMapper objectMapper;

    public PushDropListener(
        PushSubscriptionRepository subscriptions,
        UserRepository users,
        ProductRepository products,
        PriceAlertRepository alerts,
        WebPushProvider webPushProvider,
        PushOutbox pushOutbox,
        ObjectMapper objectMapper
    ) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.products = products;
        this.alerts = alerts;
        this.webPushProvider = webPushProvider;
        this.pushOutbox = pushOutbox;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = QueueNames.PUSH_PRICE_DROP)
    public void onPriceDropped(PriceDroppedEvent event) {
        if (!this.webPushProvider.isEnabled()) {
            return;   // push not configured (dev) — ack + no-op
        }
        List<PushSubscription> subs = this.subscriptions.findByUserId(event.userId());
        if (subs.isEmpty()) {
            return;   // user has no subscribed devices
        }
        User user = this.users.findById(event.userId())
            .orElseThrow(() -> new IllegalStateException("User not found: " + event.userId()));
        Product product = this.products.findById(event.productId())
            .orElseThrow(() -> new IllegalStateException("Product not found: " + event.productId()));
        PriceAlert alert = event.alertId() == null ? null
            : this.alerts.findById(event.alertId()).orElse(null);

        byte[] payload = buildPayload(product, event);
        String eventId = event.id().toString();
        // Attempt EVERY device even if one fails transiently, so a single flaky endpoint can't
        // starve the others. dispatch() throws only on a transient failure; collect those and
        // rethrow once at the end to retry the whole event — already-SENT devices dedup-skip on
        // redelivery, so only the still-failing ones are retried.
        RuntimeException transientFailure = null;
        int transientCount = 0;
        for (PushSubscription sub : subs) {
            NotificationLog claim = new NotificationLog();
            claim.setUser(user);
            claim.setAlert(alert);
            claim.setProduct(product);
            claim.setChannel(NotificationLog.Channel.PUSH);
            claim.setEventId(eventId);
            // Per-device dedup key: one (drop, device) handled at most once.
            claim.setMessageUuid(Hashing.sha256Hex(eventId + ":" + sub.getEndpoint()));
            try {
                this.pushOutbox.dispatch(claim, sub, payload, "price-drop");
            } catch (RuntimeException transientForThisDevice) {
                transientCount++;
                transientFailure = transientForThisDevice;
            }
        }
        if (transientFailure != null) {
            throw new RuntimeException(
                transientCount + " push subscription(s) failed transiently; retrying the event",
                transientFailure);
        }
    }

    private byte[] buildPayload(Product product, PriceDroppedEvent event) {
        String name = sanitize(product.getName());
        String title = "Price drop: " + (name.isBlank() ? "your tracked product" : name);
        String body = "Now " + event.newPrice() + " (was " + event.oldPrice() + ")";
        // Internal route only (H7): the SW opens same-origin; the app handles outbound merchant links.
        String url = "/products/" + event.productId();
        try {
            return this.objectMapper.writeValueAsBytes(Map.of("title", title, "body", body, "url", url));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to build push payload", e);
        }
    }

    private static String sanitize(String value) {
        if (value == null) return "";
        return value.replaceAll("[\\r\\n]", " ").trim();
    }
}
