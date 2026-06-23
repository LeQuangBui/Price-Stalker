package com.pricestalker.emailservice.listener;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.AlertEmailEvent;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.emailservice.outbox.EmailOutbox;
import com.pricestalker.emailservice.provider.MailMessage;
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
    private EmailOutbox emailOutbox;

    private AlertEmailListener listener;

    @BeforeEach
    void setUp() {
        listener = new AlertEmailListener(
                notificationLogRepository,
                userRepository,
                templateRenderService,
                emailOutbox
        );
    }

    private static User user() {
        User user = new User("hung", "hung@example.com", "hashed");
        user.setId("user-1");
        return user;
    }

    private static AlertEmailEvent event(UUID id) {
        return new AlertEmailEvent(
                id,
                "user-1",
                "email-verification",
                Map.of("verificationCode", "123456", "expiresInMinutes", 15),
                Instant.parse("2026-04-25T00:00:00Z")
        );
    }

    @Test
    void dispatchesVerificationEmailToOutbox() {
        User user = user();
        AlertEmailEvent event = event(UUID.fromString("11111111-1111-1111-1111-111111111111"));

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(templateRenderService.render(eq("email-verification"), anyMap())).thenReturn("<p>123456</p>");
        when(templateRenderService.renderText(eq("email-verification"), anyMap())).thenReturn("code 123456");

        listener.onAlertEmail(event);

        ArgumentCaptor<Map<String, Object>> modelCaptor = ArgumentCaptor.forClass(Map.class);
        verify(templateRenderService).render(eq("email-verification"), modelCaptor.capture());
        verify(templateRenderService).renderText(eq("email-verification"), anyMap());
        Map<String, Object> model = modelCaptor.getValue();
        assertThat(model).containsEntry("verificationCode", "123456");
        assertThat(model).containsEntry("expiresInMinutes", 15);
        assertThat(model).containsEntry("user", user);
        assertThat(model).containsEntry("requestedAt", event.requestedAt());

        ArgumentCaptor<NotificationLog> claimCaptor = ArgumentCaptor.forClass(NotificationLog.class);
        ArgumentCaptor<MailMessage> messageCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(emailOutbox).dispatch(claimCaptor.capture(), messageCaptor.capture(), eq("alert:email-verification"));

        MailMessage message = messageCaptor.getValue();
        assertThat(message.to()).isEqualTo("hung@example.com");
        assertThat(message.subject()).isEqualTo("Verify your Price Stalker email");
        assertThat(message.htmlBody()).isEqualTo("<p>123456</p>");
        assertThat(message.textBody()).isEqualTo("code 123456");
        assertThat(message.replyTo()).isNull();

        NotificationLog claim = claimCaptor.getValue();
        assertThat(claim.getUser()).isEqualTo(user);
        assertThat(claim.getAlert()).isNull();
        assertThat(claim.getProduct()).isNull();
        assertThat(claim.getChannel()).isEqualTo(NotificationLog.Channel.EMAIL);
        assertThat(claim.getMessageUuid()).isEqualTo(event.id().toString());
    }

    @Test
    void ignoresDuplicateMessageUuid() {
        AlertEmailEvent event = event(UUID.fromString("22222222-2222-2222-2222-222222222222"));
        when(notificationLogRepository.findByMessageUuid(event.id().toString()))
                .thenReturn(new NotificationLog());

        listener.onAlertEmail(event);

        verifyNoInteractions(userRepository, templateRenderService, emailOutbox);
    }
}
