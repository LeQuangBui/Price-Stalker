package com.pricestalker.emailservice.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.PriceDroppedEvent;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.core.util.Hashing;
import com.pricestalker.emailservice.outbox.PushOutbox;
import com.pricestalker.emailservice.provider.WebPushProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PushDropListenerTest {
    @Mock
    private PushSubscriptionRepository subscriptions;
    @Mock
    private UserRepository users;
    @Mock
    private ProductRepository products;
    @Mock
    private PriceAlertRepository alerts;
    @Mock
    private WebPushProvider webPushProvider;
    @Mock
    private PushOutbox pushOutbox;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private PushDropListener listener;

    private static final String EVENT_ID = "11111111-1111-1111-1111-111111111111";

    @BeforeEach
    void setUp() {
        listener = new PushDropListener(
                subscriptions, users, products, alerts, webPushProvider, pushOutbox, objectMapper);
    }

    private PriceDroppedEvent event(String userId, String productId, String alertId) {
        return new PriceDroppedEvent(
                UUID.fromString(EVENT_ID),
                alertId,
                userId,
                productId,
                new BigDecimal("999.99"),
                new BigDecimal("799.99"),
                Instant.parse("2026-04-25T00:00:00Z"));
    }

    private PushSubscription sub(String endpoint, String hash) {
        PushSubscription s = new PushSubscription();
        s.setEndpoint(endpoint);
        s.setEndpointHash(hash);
        s.setP256dh("p256");
        s.setAuth("auth");
        return s;
    }

    @Test
    void noopWhenPushDisabled() {
        when(webPushProvider.isEnabled()).thenReturn(false);

        listener.onPriceDropped(event("user-1", "product-1", "alert-1"));

        verifyNoInteractions(subscriptions, users, products, alerts, pushOutbox);
    }

    @Test
    void noDispatchWhenUserHasNoSubscriptions() {
        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of());

        listener.onPriceDropped(event("user-1", "product-1", "alert-1"));

        verifyNoInteractions(users, products, alerts, pushOutbox);
    }

    @Test
    void dispatchesOnePushPerSubscriptionWithValidPayload() throws Exception {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        Product product = new Product();
        product.setId("product-1");
        product.setName("GTX 4070");
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");

        PushSubscription s1 = sub("https://push.example.com/ep1", "hash-1");
        PushSubscription s2 = sub("https://push.example.com/ep2", "hash-2");

        PriceDroppedEvent event = event(user.getId(), product.getId(), alert.getId());

        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of(s1, s2));
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(products.findById("product-1")).thenReturn(Optional.of(product));
        when(alerts.findById("alert-1")).thenReturn(Optional.of(alert));

        listener.onPriceDropped(event);

        ArgumentCaptor<NotificationLog> claimCaptor = ArgumentCaptor.forClass(NotificationLog.class);
        ArgumentCaptor<byte[]> payloadCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(pushOutbox, times(2)).dispatch(
                claimCaptor.capture(), any(PushSubscription.class), payloadCaptor.capture(), eq("price-drop"));

        // Both claims are PUSH, carry the drop's event_id, and have per-device dedup keys.
        List<NotificationLog> claims = claimCaptor.getAllValues();
        assertThat(claims).hasSize(2);
        assertThat(claims).allSatisfy(c -> {
            assertThat(c.getChannel()).isEqualTo(NotificationLog.Channel.PUSH);
            assertThat(c.getEventId()).isEqualTo(EVENT_ID);
            assertThat(c.getUser()).isEqualTo(user);
            assertThat(c.getProduct()).isEqualTo(product);
            assertThat(c.getAlert()).isEqualTo(alert);
        });
        assertThat(claims.get(0).getMessageUuid())
                .isEqualTo(Hashing.sha256Hex(EVENT_ID + ":" + s1.getEndpoint()));
        assertThat(claims.get(1).getMessageUuid())
                .isEqualTo(Hashing.sha256Hex(EVENT_ID + ":" + s2.getEndpoint()));
        assertThat(claims.get(0).getMessageUuid()).isNotEqualTo(claims.get(1).getMessageUuid());

        // Payload is valid JSON with title/body and an internal product deep-link (H7).
        Map<?, ?> payload = objectMapper.readValue(payloadCaptor.getValue(), Map.class);
        assertThat(payload.get("title")).isEqualTo("Price drop: GTX 4070");
        assertThat(payload.get("body").toString()).contains("799.99").contains("999.99");
        assertThat(payload.get("url")).isEqualTo("/products/product-1");
    }

    @Test
    void oneTransientFailureDoesNotStarveOtherSubscriptionsAndRethrows() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        Product product = new Product();
        product.setId("product-1");
        product.setName("GTX 4070");
        PriceAlert alert = new PriceAlert();
        alert.setId("alert-1");

        PushSubscription s1 = sub("https://push.example.com/ep1", "hash-1");
        PushSubscription s2 = sub("https://push.example.com/ep2", "hash-2");
        PriceDroppedEvent event = event(user.getId(), product.getId(), alert.getId());

        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of(s1, s2));
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(products.findById("product-1")).thenReturn(Optional.of(product));
        when(alerts.findById("alert-1")).thenReturn(Optional.of(alert));
        // First device fails transiently; the second must still be attempted.
        doThrow(new RuntimeException("transient")).doNothing()
                .when(pushOutbox).dispatch(any(), any(PushSubscription.class), any(byte[].class), eq("price-drop"));

        // The event is rethrown (so it retries), but only AFTER both devices were attempted.
        assertThatThrownBy(() -> listener.onPriceDropped(event)).isInstanceOf(RuntimeException.class);
        verify(pushOutbox, times(2))
                .dispatch(any(), any(PushSubscription.class), any(byte[].class), eq("price-drop"));
    }

    @Test
    void dispatchesWithNullAlertWhenAlertMissing() {
        User user = new User("hung", "hung@example.com", "hashed-password");
        user.setId("user-1");
        Product product = new Product();
        product.setId("product-1");
        product.setName("GTX 4070");

        PushSubscription s1 = sub("https://push.example.com/ep1", "hash-1");
        PriceDroppedEvent event = event(user.getId(), product.getId(), null);

        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of(s1));
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(products.findById("product-1")).thenReturn(Optional.of(product));

        listener.onPriceDropped(event);

        ArgumentCaptor<NotificationLog> claimCaptor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(pushOutbox).dispatch(
                claimCaptor.capture(), any(PushSubscription.class), any(byte[].class), eq("price-drop"));
        verifyNoInteractions(alerts);
        assertThat(claimCaptor.getValue().getAlert()).isNull();
    }
}
