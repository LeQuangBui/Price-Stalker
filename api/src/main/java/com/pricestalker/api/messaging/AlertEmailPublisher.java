package com.pricestalker.api.messaging;

import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.AlertEmailEvent;
import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.RoutingKeys;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class AlertEmailPublisher {
    private final RabbitTemplate rabbitTemplate;
    private final String frontendBaseUrl;

    public AlertEmailPublisher(
        RabbitTemplate rabbitTemplate,
        @Value("${app.frontend-base-url}") String frontendBaseUrl
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public void publishWelcome(User user) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("username", user.getUsername());
        vars.put("email", user.getEmail());

        publish(user, "welcome", RoutingKeys.ALERT_EMAIL_WELCOME, vars);
    }

    public void publishEmailVerification(User user, String code) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("username", user.getUsername());
        vars.put("email", user.getEmail());
        vars.put("verificationCode", code);
        vars.put("expiresInMinutes", 15);

        publish(user, "email-verification", RoutingKeys.ALERT_EMAIL_VERIFICATION, vars);
    }

    public void publishPasswordReset(User user, String token) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("username", user.getUsername());
        vars.put("email", user.getEmail());
        vars.put("resetToken", token);
        vars.put("resetUrl", this.frontendBaseUrl + "/reset-password?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8));
        vars.put("expiresInMinutes", 30);

        publish(user, "password-reset", RoutingKeys.ALERT_EMAIL_PASSWORD_RESET, vars);
    }

    private void publish(User user, String template, String routingKey, Map<String, Object> vars) {
        AlertEmailEvent event = new AlertEmailEvent(
                UUID.randomUUID(),
                user.getId(),
                template,
                vars,
                Instant.now()
        );

        this.rabbitTemplate.convertAndSend(
                ExchangeNames.MAIN,
                routingKey,
                event
        );
    }
}
