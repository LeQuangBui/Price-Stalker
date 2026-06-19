package com.pricestalker.emailservice.listener;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.AlertEmailEvent;
import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.provider.MailProvider;
import com.pricestalker.emailservice.service.TemplateRenderService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
public class AlertEmailListener {
    private final NotificationLogRepository notificationLogRepository;
    private final UserRepository userRepository;
    private final TemplateRenderService templateRenderService;
    private final MailProvider mailProvider;

    public AlertEmailListener(
        NotificationLogRepository notificationLogRepository,
        UserRepository userRepository,
        TemplateRenderService templateRenderService,
        MailProvider mailProvider
    ) {
        this.notificationLogRepository = notificationLogRepository;
        this.userRepository = userRepository;
        this.templateRenderService = templateRenderService;
        this.mailProvider = mailProvider;
    }

    @Transactional
    @RabbitListener(queues = QueueNames.EMAIL_ALERTS)
    public void onAlertEmail(AlertEmailEvent event) {
        String messageUuid = event.id().toString();
        if (this.notificationLogRepository.findByMessageUuid(messageUuid) != null) {
            return;
        }

        User user = this.userRepository.findById(event.userId())
            .orElseThrow(() -> new IllegalStateException("User not found: " + event.userId()));

        String templateName = resolveTemplateName(event.template());
        String subject = resolveSubject(event.template());

        Map<String, Object> model = new HashMap<>();
        if (event.vars() != null) {
            model.putAll(event.vars());
        }
        model.put("user", user);
        model.put("requestedAt", event.requestedAt());

        String html = this.templateRenderService.render(templateName, model);
        String providerMessageId = this.mailProvider.send(new MailMessage(
            user.getEmail(),
            subject,
            html,
            null
        ));

        NotificationLog log = new NotificationLog();
        log.setAlert(null);
        log.setUser(user);
        log.setProduct(null);
        log.setSentAt(LocalDateTime.now());
        log.setChannel(NotificationLog.Channel.EMAIL);
        log.setStatus(NotificationLog.Status.SENT);
        log.setProviderMessageId(providerMessageId);
        log.setMessageUuid(messageUuid);
        this.notificationLogRepository.save(log);
    }

    private String resolveTemplateName(String template) {
        return switch (template) {
            case "welcome" -> "welcome";
            case "email-verification" -> "email-verification";
            case "password-reset" -> "password-reset";
            default -> throw new IllegalStateException("Unsupported auth email template: " + template);
        };
    }

    private String resolveSubject(String template) {
        return switch (template) {
            case "welcome" -> "Welcome to Price Stalker";
            case "email-verification" -> "Verify your Price Stalker email";
            case "password-reset" -> "Reset your Price Stalker password";
            default -> throw new IllegalStateException("Unsupported auth email template: " + template);
        };
    }
}
