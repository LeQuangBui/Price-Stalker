package com.pricestalker.emailservice.listener;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.AlertEmailEvent;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.provider.MailProvider;
import com.pricestalker.emailservice.service.TemplateRenderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AlertEmailListenerTest {
    @Mock
    private NotificationLogRepository notificationLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TemplateRenderService templateRenderService;

    @Mock
    private MailProvider mailProvider;

    private AlertEmailListener listener;

    @BeforeEach
    void setUp() {
        listener = new AlertEmailListener(
                notificationLogRepository,
                userRepository,
                templateRenderService,
                mailProvider
        );
    }

    @Test
    void sendsVerificationEmailAndPersistsNotificationLog() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        AlertEmailEvent event = new AlertEmailEvent(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                user.getId(),
                "email-verification",
                Map.of("verificationCode", "123456", "expiresInMinutes", 15),
                Instant.parse("2026-04-25T00:00:00Z")
        );

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(templateRenderService.render(eq("email-verification"), anyMap())).thenReturn("<p>123456</p>");
        when(mailProvider.send(any(MailMessage.class))).thenReturn("resend-message-1");

        listener.onAlertEmail(event);

        ArgumentCaptor<Map<String, Object>> modelCaptor = ArgumentCaptor.forClass(Map.class);
        verify(templateRenderService).render(eq("email-verification"), modelCaptor.capture());
        assertThat(modelCaptor.getValue()).containsEntry("verificationCode", "123456");
        assertThat(modelCaptor.getValue()).containsEntry("expiresInMinutes", 15);
        assertThat(modelCaptor.getValue()).containsEntry("user", user);
        assertThat(modelCaptor.getValue()).containsEntry("requestedAt", event.requestedAt());

        ArgumentCaptor<MailMessage> mailCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailProvider).send(mailCaptor.capture());
        assertThat(mailCaptor.getValue().to()).isEqualTo("hung@example.com");
        assertThat(mailCaptor.getValue().subject()).isEqualTo("Verify your Price Stalker email");
        assertThat(mailCaptor.getValue().htmlBody()).isEqualTo("<p>123456</p>");

        ArgumentCaptor<NotificationLog> logCaptor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository).save(logCaptor.capture());
        NotificationLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getUser()).isEqualTo(user);
        assertThat(savedLog.getChannel()).isEqualTo(NotificationLog.Channel.EMAIL);
        assertThat(savedLog.getStatus()).isEqualTo(NotificationLog.Status.SENT);
        assertThat(savedLog.getProviderMessageId()).isEqualTo("resend-message-1");
        assertThat(savedLog.getMessageUuid()).isEqualTo(event.id().toString());
    }

    @Test
    void ignoresDuplicateMessageUuid() {
        AlertEmailEvent event = new AlertEmailEvent(
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                "user-1",
                "password-reset",
                Map.of("resetToken", "token-1"),
                Instant.parse("2026-04-25T00:00:00Z")
        );
        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(new NotificationLog());

        listener.onAlertEmail(event);

        verify(notificationLogRepository, never()).save(any(NotificationLog.class));
        verifyNoInteractions(userRepository, templateRenderService, mailProvider);
    }
}
