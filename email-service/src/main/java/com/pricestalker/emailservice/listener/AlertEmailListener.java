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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
public class AlertEmailListener {
    private static final Logger log = LoggerFactory.getLogger(AlertEmailListener.class);

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
        String text = this.templateRenderService.renderText(templateName, model);

        String providerMessageId;
        try {
            providerMessageId = this.mailProvider.send(new MailMessage(
                user.getEmail(),
                subject,
                html,
                text,
                null
            ));
            log.info("email_sent template={} outcome=success messageUuid={}", event.template(), messageUuid);
        } catch (RuntimeException ex) {
            // structured send-failure counter (E1, log-based); rethrow so retry/dead-letter still applies (1A)
            log.warn("email_sent template={} outcome=failure messageUuid={} error={}",
                event.template(), messageUuid, ex.toString());
            throw ex;
        }

        NotificationLog notificationLog = new NotificationLog();
        notificationLog.setAlert(null);
        notificationLog.setUser(user);
        notificationLog.setProduct(null);
        notificationLog.setSentAt(LocalDateTime.now());
        notificationLog.setChannel(NotificationLog.Channel.EMAIL);
        notificationLog.setStatus(NotificationLog.Status.SENT);
        notificationLog.setProviderMessageId(providerMessageId);
        notificationLog.setMessageUuid(messageUuid);
        this.notificationLogRepository.save(notificationLog);
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
