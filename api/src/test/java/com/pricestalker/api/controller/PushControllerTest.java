package com.pricestalker.api.controller;

import com.pricestalker.api.dto.push.EndpointDto;
import com.pricestalker.api.dto.push.PushSubscriptionRequestDto;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.event.ExchangeNames;
import com.pricestalker.core.event.PushTestEvent;
import com.pricestalker.core.event.RoutingKeys;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.core.util.Hashing;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PushControllerTest {
    @Mock private PushSubscriptionRepository subscriptions;
    @Mock private UserRepository users;
    @Mock private RabbitTemplate rabbitTemplate;
    @Mock private Authentication auth;

    private PushController controller;
    private User user;

    @BeforeEach
    void setUp() {
        controller = new PushController(subscriptions, users, rabbitTemplate, "VAPID_PUB");
        user = new User("hung", "hung@example.com", "hashed");
        user.setId("u1");
        lenient().when(auth.getName()).thenReturn("hung");
        lenient().when(users.findByUsername("hung")).thenReturn(user);
    }

    private PushSubscriptionRequestDto subDto(String endpoint) {
        PushSubscriptionRequestDto d = new PushSubscriptionRequestDto();
        d.setEndpoint(endpoint);
        PushSubscriptionRequestDto.Keys k = new PushSubscriptionRequestDto.Keys();
        k.setP256dh("p256");
        k.setAuth("authsecret");
        d.setKeys(k);
        return d;
    }

    @Test
    void subscribeUpsertsScopedToCaller() {
        String endpoint = "https://fcm.googleapis.com/fcm/send/abc";
        when(subscriptions.findByEndpointHash(Hashing.sha256Hex(endpoint))).thenReturn(Optional.empty());

        var resp = controller.subscribe(subDto(endpoint), auth);

        assertThat(resp.getStatusCode().value()).isEqualTo(204);
        ArgumentCaptor<PushSubscription> cap = ArgumentCaptor.forClass(PushSubscription.class);
        verify(subscriptions).save(cap.capture());
        PushSubscription saved = cap.getValue();
        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getEndpoint()).isEqualTo(endpoint);
        assertThat(saved.getEndpointHash()).isEqualTo(Hashing.sha256Hex(endpoint));
        assertThat(saved.getP256dh()).isEqualTo("p256");
        assertThat(saved.getAuth()).isEqualTo("authsecret");
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    void subscribeRejectsNonAllowlistedEndpoint() {
        // SSRF guard: an internal/metadata URL is not a real browser push host → 400, never saved.
        var resp = controller.subscribe(subDto("https://169.254.169.254/latest/meta-data/"), auth);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        verify(subscriptions, never()).save(any());
    }

    @Test
    void subscribeRejectsNonHttpsEndpoint() {
        var resp = controller.subscribe(subDto("http://fcm.googleapis.com/fcm/send/abc"), auth);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        verify(subscriptions, never()).save(any());
    }

    @Test
    void unsubscribeIsScopedToCallerUserId() {
        EndpointDto d = new EndpointDto();
        d.setEndpoint("https://x/y");

        controller.unsubscribe(d, auth);

        verify(subscriptions).deleteByEndpointHashAndUserId(Hashing.sha256Hex("https://x/y"), "u1");
    }

    @Test
    void testPushPublishesOnceThenRateLimits() {
        var first = controller.sendTest(auth);
        assertThat(first.getStatusCode().value()).isEqualTo(202);
        verify(rabbitTemplate).convertAndSend(eq(ExchangeNames.MAIN), eq(RoutingKeys.PUSH_TEST), any(PushTestEvent.class));

        var second = controller.sendTest(auth); // immediate retry → rate limited
        assertThat(second.getStatusCode().value()).isEqualTo(429);
        verifyNoMoreInteractions(rabbitTemplate);
    }

    @Test
    void vapidPublicKeyIsReturned() {
        assertThat(controller.vapidPublicKey()).containsEntry("publicKey", "VAPID_PUB");
    }
}
