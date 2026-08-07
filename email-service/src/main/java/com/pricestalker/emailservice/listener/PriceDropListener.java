package com.pricestalker.emailservice.listener;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.emailservice.outbox.EmailOutbox;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.service.TemplateRenderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

@Component
public class PriceDropListener {
    private static final Logger log = LoggerFactory.getLogger(PriceDropListener.class);
    private final NotificationLogRepository notificationLogRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final TemplateRenderService templateRenderService;
    private final EmailOutbox emailOutbox;

    public PriceDropListener(
        NotificationLogRepository notificationLogRepository,
        PriceAlertRepository priceAlertRepository,
        UserRepository userRepository,
        ProductRepository productRepository,
        TemplateRenderService templateRenderService,
        EmailOutbox emailOutbox
    ) {
        this.notificationLogRepository = notificationLogRepository;
        this.priceAlertRepository = priceAlertRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.templateRenderService = templateRenderService;
        this.emailOutbox = emailOutbox;
    }

    // NOT @Transactional: the EmailOutbox commits the claim/sent/failed states in their own
    // (REQUIRES_NEW) transactions around the send.
    @RabbitListener(queues = QueueNames.EMAIL_PRICE_DROP)
    public void onPriceDropped(PriceDroppedEvent event) {
        if (event == null || event.id() == null) {
            return; // forged/malformed event with no id: drop (can't dedup; event.id().toString() would NPE)
        }
        String messageUuid = event.id().toString();
        // Fast-path dedup for terminal/handled rows (SENT, or a deliberately-kept FAILED). A SENDING
        // row is NOT terminal: let it fall through to the outbox (recent-skip vs stale-reclaim). The
        // outbox claim is the authoritative, race-safe dedup.
        NotificationLog existing = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (existing != null && existing.getStatus() != NotificationLog.Status.SENDING) {
            return;
        }

        // Defense-in-depth (BUS Issue 2): the bus is internal, but a compromised service could forge
        // a price.dropped event to email an arbitrary user. Re-load the PriceAlert as the source of
        // truth and assert it is consistent with the event before sending. If anything is off, drop.
        // Null-guard the id: CrudRepository.findById(null) throws, which would NACK + requeue a forged
        // alertId=null event into a poison-message loop instead of cleanly dropping it (mirrors PushDropListener).
        PriceAlert alert = event.alertId() == null ? null : this.priceAlertRepository.findById(event.alertId()).orElse(null);
        if (!alertConsistentWithEvent(alert, event)) {
            return;
        }

        User user = this.userRepository.findById(event.userId())
            .orElseThrow(() -> new IllegalStateException("User not found: " + event.userId()));
        Product product = this.productRepository.findById(event.productId())
            .orElseThrow(() -> new IllegalStateException("Product not found: " + event.productId()));

        Map<String, Object> model = Map.of(
            "user", user,
            "product", product,
            "alert", alert,
            "oldPrice", event.oldPrice(),
            "newPrice", event.newPrice(),
            "detectedAt", event.detectedAt()
        );
        String html = this.templateRenderService.render("price-drop", model);
        String text = this.templateRenderService.renderText("price-drop", model);
        String subject = "Price drop: " + sanitizeSubjectText(product.getName());
        MailMessage message = new MailMessage(user.getEmail(), subject, html, text, null);

        NotificationLog claim = new NotificationLog();
        claim.setAlert(alert);
        claim.setUser(user);
        claim.setProduct(product);
        claim.setChannel(NotificationLog.Channel.EMAIL);
        // Stamp the drop's event id (like PushDropListener) so the in-app bell — which filters
        // eventId IS NOT NULL and dedups per event — shows the drop even for users without push.
        claim.setEventId(event.id().toString());
        claim.setMessageUuid(messageUuid);

        this.emailOutbox.dispatch(claim, message, "price-drop");
    }

    /**
     * The PriceAlert is the source of truth. Verify the forged-or-genuine event matches: the alert
     * exists, belongs to the claimed user and product, is active, and (with the event's new price)
     * the threshold was actually crossed (newPrice &lt;= thresholdPrice). Logs and returns false on
     * any mismatch so the caller drops the message instead of notifying.
     */
    private static boolean alertConsistentWithEvent(PriceAlert alert, PriceDroppedEvent event) {
        if (alert == null) {
            log.warn("Dropping price.dropped: alert not found alertId={}", event.alertId());
            return false;
        }
        String alertUserId = alert.getUser() == null ? null : alert.getUser().getId();
        if (!Objects.equals(alertUserId, event.userId())) {
            log.warn("Dropping price.dropped: alert {} user {} != event user {}",
                event.alertId(), alertUserId, event.userId());
            return false;
        }
        String alertProductId = alert.getProduct() == null ? null : alert.getProduct().getId();
        if (!Objects.equals(alertProductId, event.productId())) {
            log.warn("Dropping price.dropped: alert {} product {} != event product {}",
                event.alertId(), alertProductId, event.productId());
            return false;
        }
        if (!Boolean.TRUE.equals(alert.getActive())) {
            log.warn("Dropping price.dropped: alert {} is not active", event.alertId());
            return false;
        }
        BigDecimal newPrice = event.newPrice();
        BigDecimal threshold = alert.getThresholdPrice();
        if (newPrice == null || threshold == null || newPrice.compareTo(threshold) > 0) {
            log.warn("Dropping price.dropped: alert {} threshold {} not crossed by newPrice {}",
                event.alertId(), threshold, newPrice);
            return false;
        }
        return true;
    }

    /**
     * Scraped product names are attacker-influenceable (a malicious listing title) and flow into
     * the email subject. JavaMail encodes the Subject header, but we defensively null-guard, strip
     * control/newline characters, collapse whitespace, and clamp length (eng review Issue 3A).
     */
    private static String sanitizeSubjectText(String value) {
        if (value == null || value.isBlank()) {
            return "your tracked product";
        }
        String cleaned = value.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        int max = 200;
        return cleaned.length() > max ? cleaned.substring(0, max) + "…" : cleaned;
    }
}
