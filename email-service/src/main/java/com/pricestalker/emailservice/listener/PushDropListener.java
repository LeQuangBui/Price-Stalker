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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Second consumer off {@code price.dropped} (alongside the email listener): sends a web push per
 * subscription via {@link PushOutbox} (claim-before-send, per device). Each push logs to
 * notification_log with Channel.PUSH and the drop's event_id so the in-app bell can dedup.
 */
@Component
public class PushDropListener {
    private static final Logger log = LoggerFactory.getLogger(PushDropListener.class);

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
        if (event == null || event.id() == null) {
            return; // forged/malformed event with no id: drop (event.id().toString() would NPE below)
        }
        if (!this.webPushProvider.isEnabled()) {
            return;   // push not configured (dev) — ack + no-op
        }
        // Defense-in-depth (BUS Issue 2): the bus is internal, but a compromised service could forge
        // a price.dropped event to push to an arbitrary user. Re-load the PriceAlert as the source
        // of truth and assert it is consistent with the event before sending. If anything is off, drop.
        PriceAlert alert = event.alertId() == null ? null
            : this.alerts.findById(event.alertId()).orElse(null);
        if (!alertConsistentWithEvent(alert, event)) {
            return;
        }

        List<PushSubscription> subs = this.subscriptions.findByUserId(event.userId());
        if (subs.isEmpty()) {
            return;   // user has no subscribed devices
        }
        User user = this.users.findById(event.userId())
            .orElseThrow(() -> new IllegalStateException("User not found: " + event.userId()));
        Product product = this.products.findById(event.productId())
            .orElseThrow(() -> new IllegalStateException("Product not found: " + event.productId()));

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

    /**
     * The PriceAlert is the source of truth. Verify the event matches: the alert exists, belongs to
     * the claimed user and product, is active, and (with the event's new price) the threshold was
     * actually crossed (newPrice &lt;= thresholdPrice). Logs and returns false on any mismatch so the
     * caller drops the message instead of pushing.
     */
    private static boolean alertConsistentWithEvent(PriceAlert alert, PriceDroppedEvent event) {
        if (alert == null) {
            log.warn("Dropping price.dropped push: alert not found alertId={}", event.alertId());
            return false;
        }
        String alertUserId = alert.getUser() == null ? null : alert.getUser().getId();
        if (!Objects.equals(alertUserId, event.userId())) {
            log.warn("Dropping price.dropped push: alert {} user {} != event user {}",
                event.alertId(), alertUserId, event.userId());
            return false;
        }
        String alertProductId = alert.getProduct() == null ? null : alert.getProduct().getId();
        if (!Objects.equals(alertProductId, event.productId())) {
            log.warn("Dropping price.dropped push: alert {} product {} != event product {}",
                event.alertId(), alertProductId, event.productId());
            return false;
        }
        if (!Boolean.TRUE.equals(alert.getActive())) {
            log.warn("Dropping price.dropped push: alert {} is not active", event.alertId());
            return false;
        }
        BigDecimal newPrice = event.newPrice();
        BigDecimal threshold = alert.getThresholdPrice();
        if (newPrice == null || threshold == null || newPrice.compareTo(threshold) > 0) {
            log.warn("Dropping price.dropped push: alert {} threshold {} not crossed by newPrice {}",
                event.alertId(), threshold, newPrice);
            return false;
        }
        return true;
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
