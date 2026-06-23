package com.pricestalker.emailservice.listener;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.AlertEmailEvent;
import com.pricestalker.core.event.QueueNames;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.emailservice.outbox.EmailOutbox;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.service.TemplateRenderService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class AlertEmailListener {
    private final NotificationLogRepository notificationLogRepository;
    private final UserRepository userRepository;
    private final TemplateRenderService templateRenderService;
    private final EmailOutbox emailOutbox;

    public AlertEmailListener(
        NotificationLogRepository notificationLogRepository,
        UserRepository userRepository,
        TemplateRenderService templateRenderService,
        EmailOutbox emailOutbox
    ) {
        this.notificationLogRepository = notificationLogRepository;
        this.userRepository = userRepository;
        this.templateRenderService = templateRenderService;
        this.emailOutbox = emailOutbox;
    }

    // NOT @Transactional: the outbox commits the claim/sent/failed states in their own
    // transactions (REQUIRES_NEW), and the send must happen between two committed states.
    @RabbitListener(queues = QueueNames.EMAIL_ALERTS)
    public void onAlertEmail(AlertEmailEvent event) {
        String messageUuid = event.id().toString();
        // Fast-path dedup for terminal/handled rows (SENT, or a deliberately-kept FAILED) — avoids
        // the load/render work for known dupes. A SENDING row is NOT terminal: let it fall through
        // to the outbox, which decides recent-skip vs stale-reclaim. The outbox claim is the
        // authoritative, race-safe dedup.
        NotificationLog existing = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (existing != null && existing.getStatus() != NotificationLog.Status.SENDING) {
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
        MailMessage message = new MailMessage(user.getEmail(), subject, html, text, null);

        NotificationLog claim = new NotificationLog();
        claim.setAlert(null);
        claim.setUser(user);
        claim.setProduct(null);
        claim.setChannel(NotificationLog.Channel.EMAIL);
        claim.setMessageUuid(messageUuid);

        this.emailOutbox.dispatch(claim, message, "alert:" + event.template());
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
