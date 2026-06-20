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
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.provider.MailProvider;
import com.pricestalker.emailservice.service.TemplateRenderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Component
public class PriceDropListener {
    private static final Logger log = LoggerFactory.getLogger(PriceDropListener.class);

    private final NotificationLogRepository notificationLogRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final TemplateRenderService templateRenderService;
    private final MailProvider mailProvider;

    public PriceDropListener(
        NotificationLogRepository notificationLogRepository,
        PriceAlertRepository priceAlertRepository,
        UserRepository userRepository,
        ProductRepository productRepository,
        TemplateRenderService templateRenderService,
        MailProvider mailProvider
    ) {
        this.notificationLogRepository = notificationLogRepository;
        this.priceAlertRepository = priceAlertRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.templateRenderService = templateRenderService;
        this.mailProvider = mailProvider;
    }

    @Transactional
    @RabbitListener(queues = QueueNames.EMAIL_PRICE_DROP)
    public void onPriceDropped(PriceDroppedEvent event) {
        String messageUuid = event.id().toString();
        if (this.notificationLogRepository.findByMessageUuid(messageUuid) != null) {
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

        String providerMessageId;
        try {
            providerMessageId = this.mailProvider.send(new MailMessage(
                user.getEmail(),
                subject,
                html,
                text,
                null
            ));
            log.info("email_sent template=price-drop outcome=success messageUuid={}", messageUuid);
        } catch (RuntimeException ex) {
            log.warn("email_sent template=price-drop outcome=failure messageUuid={} error={}",
                messageUuid, ex.toString());
            throw ex;
        }

        NotificationLog notificationLog = new NotificationLog();
        notificationLog.setAlert(alert);
        notificationLog.setUser(user);
        notificationLog.setProduct(product);
        notificationLog.setSentAt(LocalDateTime.now());
        notificationLog.setChannel(NotificationLog.Channel.EMAIL);
        notificationLog.setStatus(NotificationLog.Status.SENT);
        notificationLog.setProviderMessageId(providerMessageId);
        notificationLog.setMessageUuid(messageUuid);
        this.notificationLogRepository.save(notificationLog);
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
