package com.pricestalker.api.messaging;

import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.AlertEmailEvent;
import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.RoutingKeys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
public class AlertEmailPublisherTest {
    @Mock
    private RabbitTemplate rabbitTemplate;

    private AlertEmailPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new AlertEmailPublisher(rabbitTemplate, "http://localhost:3000");
    }

    @Test
    void publishEmailVerificationSendsVerificationTemplateToVerificationRoutingKey() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");

        publisher.publishEmailVerification(user, "123456");

        ArgumentCaptor<AlertEmailEvent> eventCaptor = ArgumentCaptor.forClass(AlertEmailEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq(ExchangeNames.MAIN),
                eq(RoutingKeys.ALERT_EMAIL_VERIFICATION),
                eventCaptor.capture()
        );

        AlertEmailEvent event = eventCaptor.getValue();
        assertThat(event.userId()).isEqualTo("user-1");
        assertThat(event.template()).isEqualTo("email-verification");
        assertThat(event.vars()).containsEntry("username", "hung");
        assertThat(event.vars()).containsEntry("email", "hung@example.com");
        assertThat(event.vars()).containsEntry("verificationCode", "123456");
        assertThat(event.vars()).containsEntry("expiresInMinutes", 15);
        assertThat(event.id()).isNotNull();
        assertThat(event.requestedAt()).isNotNull();
    }

    @Test
    void publishPasswordResetIncludesEncodedResetUrl() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");

        publisher.publishPasswordReset(user, "token with spaces");

        ArgumentCaptor<AlertEmailEvent> eventCaptor = ArgumentCaptor.forClass(AlertEmailEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq(ExchangeNames.MAIN),
                eq(RoutingKeys.ALERT_EMAIL_PASSWORD_RESET),
                eventCaptor.capture()
        );

        AlertEmailEvent event = eventCaptor.getValue();
        assertThat(event.userId()).isEqualTo("user-1");
        assertThat(event.template()).isEqualTo("password-reset");
        assertThat(event.vars()).containsEntry("resetToken", "token with spaces");
        assertThat(event.vars()).containsEntry("resetUrl", "http://localhost:3000/reset-password?token=token+with+spaces");
        assertThat(event.vars()).containsEntry("expiresInMinutes", 30);
    }
}
