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
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Component
public class PriceDropListener {
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

        String html = this.templateRenderService.render("price-drop", Map.of(
            "user", user,
            "product", product,
            "alert", alert,
            "oldPrice", event.oldPrice(),
            "newPrice", event.newPrice(),
            "detectedAt", event.detectedAt()
        ));

        String providerMessageId = this.mailProvider.send(new MailMessage(
            user.getEmail(),
            "Price drop: " + product.getName(),
            html,
            null
        ));

        NotificationLog log = new NotificationLog();
        log.setAlert(alert);
        log.setUser(user);
        log.setProduct(product);
        log.setSentAt(LocalDateTime.now());
        log.setChannel(NotificationLog.Channel.EMAIL);
        log.setStatus(NotificationLog.Status.SENT);
        log.setProviderMessageId(providerMessageId);
        log.setMessageUuid(messageUuid);
        this.notificationLogRepository.save(log);
    }
}
