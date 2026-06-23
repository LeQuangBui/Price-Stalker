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
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PriceDropListener {
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
        String messageUuid = event.id().toString();
        // Fast-path dedup for terminal/handled rows (SENT, or a deliberately-kept FAILED). A SENDING
        // row is NOT terminal: let it fall through to the outbox (recent-skip vs stale-reclaim). The
        // outbox claim is the authoritative, race-safe dedup.
        NotificationLog existing = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (existing != null && existing.getStatus() != NotificationLog.Status.SENDING) {
            return;
        }

        User user = this.userRepository.findById(event.userId())
            .orElseThrow(() -> new IllegalStateException("User not found: " + event.userId()));
        Product product = this.productRepository.findById(event.productId())
            .orElseThrow(() -> new IllegalStateException("Product not found: " + event.productId()));
        PriceAlert alert = this.priceAlertRepository.findById(event.alertId())
            .orElseThrow(() -> new IllegalStateException("Price alert not found: " + event.alertId()));

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
        claim.setMessageUuid(messageUuid);

        this.emailOutbox.dispatch(claim, message, "price-drop");
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
