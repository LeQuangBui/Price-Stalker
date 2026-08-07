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
import com.pricestalker.emailservice.outbox.EmailOutbox;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.service.TemplateRenderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
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
    private EmailOutbox emailOutbox;

    private PriceDropListener listener;

    @BeforeEach
    void setUp() {
        listener = new PriceDropListener(
                notificationLogRepository,
                priceAlertRepository,
                userRepository,
                productRepository,
                templateRenderService,
                emailOutbox
        );
    }

    private PriceDroppedEvent event(String userId, String productId, String alertId) {
        return new PriceDroppedEvent(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                alertId,
                userId,
                productId,
                new BigDecimal("999.99"),
                new BigDecimal("799.99"),
                Instant.parse("2026-04-25T00:00:00Z")
        );
    }

    @Test
    void dispatchesPriceDropEmailViaOutbox() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        Product product = new Product();
        product.setId("product-1");
        product.setName("GTX 4070");
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");
        // Make the re-loaded alert consistent with the event (BUS Issue 2): same user, same product,
        // active, and a threshold the event's newPrice (799.99) actually crosses.
        alert.setUser(user);
        alert.setProduct(product);
        alert.setActive(true);
        alert.setThresholdPrice(new BigDecimal("899.99"));

        PriceDroppedEvent event = event(user.getId(), product.getId(), alert.getId());

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(priceAlertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(templateRenderService.render(eq("price-drop"), anyMap())).thenReturn("<p>price drop</p>");
        when(templateRenderService.renderText(eq("price-drop"), anyMap())).thenReturn("price drop text");

        listener.onPriceDropped(event);

        ArgumentCaptor<NotificationLog> claimCaptor = ArgumentCaptor.forClass(NotificationLog.class);
        ArgumentCaptor<MailMessage> messageCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(emailOutbox).dispatch(claimCaptor.capture(), messageCaptor.capture(), eq("price-drop"));

        MailMessage message = messageCaptor.getValue();
        assertThat(message.to()).isEqualTo("hung@example.com");
        assertThat(message.subject()).startsWith("Price drop: ");
        assertThat(message.subject()).isEqualTo("Price drop: GTX 4070");
        assertThat(message.htmlBody()).isEqualTo("<p>price drop</p>");
        assertThat(message.textBody()).isEqualTo("price drop text");

        NotificationLog claim = claimCaptor.getValue();
        assertThat(claim.getAlert()).isEqualTo(alert);
        assertThat(claim.getUser()).isEqualTo(user);
        assertThat(claim.getProduct()).isEqualTo(product);
        assertThat(claim.getChannel()).isEqualTo(NotificationLog.Channel.EMAIL);
        assertThat(claim.getMessageUuid()).isEqualTo(event.id().toString());
    }

    @Test
    void ignoresDuplicateMessageUuid() {
        PriceDroppedEvent event = event("user-1", "product-1", "alert-1");
        when(notificationLogRepository.findByMessageUuid(event.id().toString()))
                .thenReturn(new NotificationLog());

        listener.onPriceDropped(event);

        verifyNoInteractions(
                userRepository,
                productRepository,
                priceAlertRepository,
                templateRenderService,
                emailOutbox
        );
    }

    @Test
    void sanitizesNewlinesFromProductNameInSubject() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        Product product = new Product();
        product.setId("product-1");
        product.setName("Evil\r\nBcc: x@y.com");
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");
        // Consistent alert so the message is actually dispatched (BUS Issue 2).
        alert.setUser(user);
        alert.setProduct(product);
        alert.setActive(true);
        alert.setThresholdPrice(new BigDecimal("899.99"));

        PriceDroppedEvent event = event(user.getId(), product.getId(), alert.getId());

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(priceAlertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(templateRenderService.render(eq("price-drop"), anyMap())).thenReturn("<p>price drop</p>");
        when(templateRenderService.renderText(eq("price-drop"), anyMap())).thenReturn("price drop text");

        listener.onPriceDropped(event);

        ArgumentCaptor<MailMessage> messageCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(emailOutbox).dispatch(any(NotificationLog.class), messageCaptor.capture(), eq("price-drop"));

        String subject = messageCaptor.getValue().subject();
        assertThat(subject).doesNotContain("\r");
        assertThat(subject).doesNotContain("\n");
        assertThat(subject).isEqualTo("Price drop: Evil Bcc: x@y.com");
    }

    @Test
    void usesFallbackSubjectWhenProductNameIsNull() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        Product product = new Product();
        product.setId("product-1");
        product.setName(null);
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");
        // Consistent alert so the message is actually dispatched (BUS Issue 2).
        alert.setUser(user);
        alert.setProduct(product);
        alert.setActive(true);
        alert.setThresholdPrice(new BigDecimal("899.99"));

        PriceDroppedEvent event = event(user.getId(), product.getId(), alert.getId());

        when(notificationLogRepository.findByMessageUuid(event.id().toString())).thenReturn(null);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(priceAlertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(templateRenderService.render(eq("price-drop"), anyMap())).thenReturn("<p>price drop</p>");
        when(templateRenderService.renderText(eq("price-drop"), anyMap())).thenReturn("price drop text");

        listener.onPriceDropped(event);

        ArgumentCaptor<MailMessage> messageCaptor = ArgumentCaptor.forClass(MailMessage.class);
        verify(emailOutbox).dispatch(any(NotificationLog.class), messageCaptor.capture(), eq("price-drop"));

        assertThat(messageCaptor.getValue().subject()).isEqualTo("Price drop: your tracked product");
    }
}
