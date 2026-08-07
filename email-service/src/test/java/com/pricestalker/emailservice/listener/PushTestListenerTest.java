package com.pricestalker.emailservice.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.event.PushTestEvent;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.emailservice.provider.WebPushProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PushTestListenerTest {
    @Mock
    private PushSubscriptionRepository subscriptions;
    @Mock
    private WebPushProvider webPushProvider;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private PushTestListener listener;

    @BeforeEach
    void setUp() {
        listener = new PushTestListener(subscriptions, webPushProvider, objectMapper);
    }

    private PushTestEvent event() {
        return new PushTestEvent("user-1", Instant.parse("2026-04-25T00:00:00Z"));
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
    void noopWhenPushDisabled() throws IOException {
        when(webPushProvider.isEnabled()).thenReturn(false);

        listener.onPushTest(event());

        verifyNoInteractions(subscriptions);
        verify(webPushProvider, never()).send(anyString(), anyString(), anyString(), any());
    }

    @Test
    void noSendWhenNoSubscriptions() throws IOException {
        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of());

        listener.onPushTest(event());

        verify(webPushProvider, never()).send(anyString(), anyString(), anyString(), any());
    }

    @Test
    void sendsCannedPushToEachSubscriptionWithoutLogging() throws IOException {
        PushSubscription s1 = sub("https://push.example.com/ep1", "hash-1");
        PushSubscription s2 = sub("https://push.example.com/ep2", "hash-2");

        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of(s1, s2));
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(201);

        listener.onPushTest(event());

        verify(webPushProvider, times(2)).send(anyString(), anyString(), anyString(), any());
        // A test must never prune or otherwise mutate subscriptions on success.
        verify(subscriptions, never()).delete(any(PushSubscription.class));
    }

    @Test
    void bestEffortContinuesWhenOneDeviceThrowsIoException() throws IOException {
        PushSubscription s1 = sub("https://push.example.com/ep1", "hash-1");
        PushSubscription s2 = sub("https://push.example.com/ep2", "hash-2");

        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of(s1, s2));
        when(webPushProvider.send(anyString(), anyString(), anyString(), any()))
                .thenThrow(new IOException("net")).thenReturn(201);

        // A transient failure on one device must NOT propagate (no retry/DLQ for a test) and must
        // not stop the second device from being attempted.
        listener.onPushTest(event());

        verify(webPushProvider, times(2)).send(anyString(), anyString(), anyString(), any());
    }

    @Test
    void prunesSubscriptionOnGone410() throws IOException {
        PushSubscription s1 = sub("https://push.example.com/ep1", "hash-1");

        when(webPushProvider.isEnabled()).thenReturn(true);
        when(subscriptions.findByUserId("user-1")).thenReturn(List.of(s1));
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(410);

        listener.onPushTest(event());

        verify(subscriptions).delete(s1);
    }
}
