package com.pricestalker.emailservice.outbox;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.emailservice.provider.WebPushProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class PushOutboxTest {
    @Mock
    private NotificationLogRepository notificationLogRepository;

    @Mock
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Mock
    private WebPushProvider webPushProvider;

    @Mock
    private PlatformTransactionManager txm;

    private PushOutbox pushOutbox;

    private static final String UUID = "22222222-2222-2222-2222-222222222222";
    private static final String HASH = "hash-1";
    private static final byte[] PAYLOAD = {1, 2, 3};

    @BeforeEach
    void setUp() {
        // Make the programmatic TransactionTemplate run its callbacks against a mock status.
        when(txm.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        pushOutbox = new PushOutbox(
                notificationLogRepository, pushSubscriptionRepository, webPushProvider, txm);
    }

    private NotificationLog newClaim() {
        NotificationLog claim = new NotificationLog();
        claim.setMessageUuid(UUID);
        claim.setChannel(NotificationLog.Channel.PUSH);
        return claim;
    }

    private PushSubscription sub() {
        PushSubscription s = new PushSubscription();
        s.setEndpoint("https://push.example.com/ep1");
        s.setEndpointHash(HASH);
        s.setP256dh("p256");
        s.setAuth("auth");
        return s;
    }

    @Test
    void success2xxMarksSentAndTouchesSubscription() throws IOException {
        NotificationLog claim = newClaim();
        PushSubscription sub = sub();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(pushSubscriptionRepository.findByEndpointHash(HASH)).thenReturn(Optional.of(sub));
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(201);

        pushOutbox.dispatch(claim, sub, PAYLOAD, "price-drop");

        verify(notificationLogRepository).saveAndFlush(claim);
        assertThat(claim.getStatus()).isEqualTo(NotificationLog.Status.SENT);
        assertThat(claim.getProviderMessageId()).isEqualTo("201");
        // touchSubscription stamped the success time and saved.
        assertThat(sub.getLastSuccessAt()).isNotNull();
        verify(pushSubscriptionRepository).save(sub);
        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
    }

    @Test
    void duplicateMessageUuidSkipsWithoutSending() throws IOException {
        NotificationLog claim = newClaim();
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(new NotificationLog());

        pushOutbox.dispatch(claim, sub(), PAYLOAD, "price-drop");

        verifyNoInteractions(webPushProvider);
        verify(notificationLogRepository, never()).saveAndFlush(any(NotificationLog.class));
    }

    @Test
    void reclaimsStaleSendingClaimAndResends() throws IOException {
        // A SENDING row left behind by a worker that died mid-send (older than STALE_CLAIM_AFTER).
        NotificationLog stale = newClaim();
        stale.setStatus(NotificationLog.Status.SENDING);
        stale.setSentAt(LocalDateTime.now().minusMinutes(30));
        PushSubscription sub = sub();

        // stale row on the claim-fetch, and again for markSent's re-fetch.
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(stale, stale);
        when(pushSubscriptionRepository.findByEndpointHash(HASH)).thenReturn(Optional.of(sub));
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(201);

        pushOutbox.dispatch(newClaim(), sub, PAYLOAD, "price-drop");

        // re-drove the stale claim and marked it SENT (not silently dropped).
        verify(notificationLogRepository).saveAndFlush(stale);
        assertThat(stale.getStatus()).isEqualTo(NotificationLog.Status.SENT);
    }

    @Test
    void skipsFreshInFlightSendingClaim() throws IOException {
        // A SENDING row that is still fresh — another attempt is in flight, so do not re-send.
        NotificationLog inFlight = newClaim();
        inFlight.setStatus(NotificationLog.Status.SENDING);
        inFlight.setSentAt(LocalDateTime.now());
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(inFlight);

        pushOutbox.dispatch(newClaim(), sub(), PAYLOAD, "price-drop");

        verifyNoInteractions(webPushProvider);
        verify(notificationLogRepository, never()).saveAndFlush(any(NotificationLog.class));
    }

    @Test
    void gone410PrunesSubscriptionAndMarksFailed() throws IOException {
        NotificationLog claim = newClaim();
        PushSubscription sub = sub();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(pushSubscriptionRepository.findByEndpointHash(HASH)).thenReturn(Optional.of(sub));
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(410);

        pushOutbox.dispatch(claim, sub, PAYLOAD, "price-drop");

        verify(pushSubscriptionRepository).delete(sub);
        verify(notificationLogRepository).save(claim);
        assertThat(claim.getStatus()).isEqualTo(NotificationLog.Status.FAILED);
    }

    @Test
    void transientStatus5xxReleasesClaimAndRethrows() throws IOException {
        NotificationLog claim = newClaim();
        PushSubscription sub = sub();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(503);

        assertThatThrownBy(() -> pushOutbox.dispatch(claim, sub, PAYLOAD, "price-drop"))
                .isInstanceOf(RuntimeException.class);

        // release deletes the SENDING row so the retry re-claims and re-sends.
        verify(notificationLogRepository).delete(claim);
        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
    }

    @Test
    void networkIoExceptionReleasesClaimAndRethrows() throws IOException {
        NotificationLog claim = newClaim();
        PushSubscription sub = sub();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(webPushProvider.send(anyString(), anyString(), anyString(), any()))
                .thenThrow(new IOException("connection reset"));

        assertThatThrownBy(() -> pushOutbox.dispatch(claim, sub, PAYLOAD, "price-drop"))
                .isInstanceOf(RuntimeException.class);

        verify(notificationLogRepository).delete(claim);
    }

    @Test
    void configBugMarksFailedAndDoesNotRetry() throws IOException {
        NotificationLog claim = newClaim();
        PushSubscription sub = sub();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(webPushProvider.send(anyString(), anyString(), anyString(), any()))
                .thenThrow(new IllegalStateException("VAPID config bug"));

        // No throw — a config bug must not retry/DLQ forever.
        pushOutbox.dispatch(claim, sub, PAYLOAD, "price-drop");

        verify(notificationLogRepository).save(claim);
        verify(notificationLogRepository, never()).delete(any(NotificationLog.class));
        assertThat(claim.getStatus()).isEqualTo(NotificationLog.Status.FAILED);
    }

    @Test
    void nonRetryable4xxMarksFailedWithoutPruneOrRetry() throws IOException {
        NotificationLog claim = newClaim();
        PushSubscription sub = sub();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(webPushProvider.send(anyString(), anyString(), anyString(), any())).thenReturn(400);

        pushOutbox.dispatch(claim, sub, PAYLOAD, "price-drop");

        verify(notificationLogRepository).save(claim);
        assertThat(claim.getStatus()).isEqualTo(NotificationLog.Status.FAILED);
        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
        verify(notificationLogRepository, never()).delete(any(NotificationLog.class));
    }
}
