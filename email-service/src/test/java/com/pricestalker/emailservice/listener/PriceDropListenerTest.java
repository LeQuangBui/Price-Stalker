package com.pricestalker.emailservice.listener;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PriceDropListenerTest {
    @Mock
    private NotificationLogRepository notificationLogRepository;

    @Mock
    private PriceAlertRepository priceAlertRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private TemplateRenderService templateRenderService;

    @Mock
    private MailProvider mailProvider;

    private PriceDropListener listener;

    @BeforeEach
    void setUp() {
        listener = new PriceDropListener(
                notificationLogRepository,
                priceAlertRepository,
                userRepository,
                productRepository,
                templateRenderService,
                mailProvider
        );
    }

    private static User user() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        return user;
    }

    private static Product product(String name) {
        Product product = new Product();
        product.setId("product-1");
        product.setName(name);
        return product;
    }

    private static PriceAlert alert() {
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");
        return alert;
    }

    private static PriceDroppedEvent event(UUID id) {
        return new PriceDroppedEvent(
                id,
                "alert-1",
                "user-1",
                "product-1",
                new BigDecimal("99.99"),
                new BigDecimal("79.99"),
                Instant.parse("2026-04-25T00:00:00Z")
        );
    }

    @Test
    void sendsPriceDropEmailAndPersistsNotificationLog() {
        User user = user();
        Product product = product("Cool Gadget");
        PriceAlert alert = alert();
        PriceDroppedEvent event = event(UUID.fromString("11111111-1111-1111-1111-111111111111"));

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(priceAlertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(templateRenderService.render(eq("price-drop"), anyMap())).thenReturn("<p>price drop</p>");
        when(templateRenderService.renderText(eq("price-drop"), anyMap())).thenReturn("price drop");
        when(mailProvider.send(any(MailMessage.class))).thenReturn("provider-message-1");

        listener.onPriceDropped(event);

        ArgumentCaptor<Map<String, Object>> modelCaptor = ArgumentCaptor.forClass(Map.class);
        verify(templateRenderService).render(eq("price-drop"), modelCaptor.capture());
        verify(templateRenderService).renderText(eq("price-drop"), anyMap());
        Map<String, Object> model = modelCaptor.getValue();
        assertThat(model).containsEntry("user", user);
        assertThat(model).containsEntry("product", product);
        assertThat(model).containsEntry("alert", alert);
        assertThat(model).containsEntry("oldPrice", event.oldPrice());
        assertThat(model).containsEntry("newPrice", event.newPrice());
        assertThat(model).containsEntry("detectedAt", event.detectedAt());

        ArgumentCaptor<MailMessage> mailCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailProvider).send(mailCaptor.capture());
        MailMessage sent = mailCaptor.getValue();
        assertThat(sent.to()).isEqualTo("hung@example.com");
        assertThat(sent.subject()).startsWith("Price drop: ");
        assertThat(sent.htmlBody()).isEqualTo("<p>price drop</p>");
        assertThat(sent.textBody()).isEqualTo("price drop");

        ArgumentCaptor<NotificationLog> logCaptor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository).save(logCaptor.capture());
        NotificationLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getAlert()).isEqualTo(alert);
        assertThat(savedLog.getProduct()).isEqualTo(product);
        assertThat(savedLog.getUser()).isEqualTo(user);
        assertThat(savedLog.getChannel()).isEqualTo(NotificationLog.Channel.EMAIL);
        assertThat(savedLog.getStatus()).isEqualTo(NotificationLog.Status.SENT);
        assertThat(savedLog.getProviderMessageId()).isEqualTo("provider-message-1");
        assertThat(savedLog.getMessageUuid()).isEqualTo(event.id().toString());
    }

    @Test
    void ignoresDuplicateMessageUuid() {
        PriceDroppedEvent event = event(UUID.fromString("22222222-2222-2222-2222-222222222222"));
        when(notificationLogRepository.findByMessageUuid(event.id().toString()))
                .thenReturn(new NotificationLog());

        listener.onPriceDropped(event);

        verify(notificationLogRepository, never()).save(any(NotificationLog.class));
        verifyNoInteractions(userRepository, productRepository, priceAlertRepository,
                templateRenderService, mailProvider);
    }

    @Test
    void sanitizesProductNameInSubject() {
        User user = user();
        Product product = product("Evil\r\nBcc: x@y.com");
        PriceAlert alert = alert();
        PriceDroppedEvent event = event(UUID.fromString("33333333-3333-3333-3333-333333333333"));

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(priceAlertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(templateRenderService.render(eq("price-drop"), anyMap())).thenReturn("<p>price drop</p>");
        when(templateRenderService.renderText(eq("price-drop"), anyMap())).thenReturn("price drop");
        when(mailProvider.send(any(MailMessage.class))).thenReturn("provider-message-1");

        listener.onPriceDropped(event);

        ArgumentCaptor<MailMessage> mailCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailProvider).send(mailCaptor.capture());
        String subject = mailCaptor.getValue().subject();
        assertThat(subject).startsWith("Price drop: ");
        assertThat(subject).doesNotContain("\r").doesNotContain("\n");
        assertThat(subject).isEqualTo("Price drop: Evil Bcc: x@y.com");
    }

    @Test
    void usesFallbackSubjectWhenProductNameNull() {
        User user = user();
        Product product = product(null);
        PriceAlert alert = alert();
        PriceDroppedEvent event = event(UUID.fromString("44444444-4444-4444-4444-444444444444"));

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(priceAlertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(templateRenderService.render(eq("price-drop"), anyMap())).thenReturn("<p>price drop</p>");
        when(templateRenderService.renderText(eq("price-drop"), anyMap())).thenReturn("price drop");
        when(mailProvider.send(any(MailMessage.class))).thenReturn("provider-message-1");

        listener.onPriceDropped(event);

        ArgumentCaptor<MailMessage> mailCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailProvider).send(mailCaptor.capture());
        assertThat(mailCaptor.getValue().subject()).isEqualTo("Price drop: your tracked product");
    }
}
