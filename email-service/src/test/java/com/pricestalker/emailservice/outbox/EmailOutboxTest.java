package com.pricestalker.emailservice.outbox;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.provider.MailProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.MailSendException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class EmailOutboxTest {
    @Mock
    private NotificationLogRepository notificationLogRepository;

    @Mock
    private MailProvider mailProvider;

    @Mock
    private PlatformTransactionManager txm;

    private EmailOutbox emailOutbox;

    private static final String UUID = "11111111-1111-1111-1111-111111111111";

    @BeforeEach
    void setUp() {
        // Make the programmatic TransactionTemplate actually run its callbacks: getTransaction
        // returns a (mock) status, the template runs the callback, then commits (no-op on the mock).
        when(txm.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        emailOutbox = new EmailOutbox(notificationLogRepository, mailProvider, txm);
    }

    private NotificationLog newClaim() {
        NotificationLog claim = new NotificationLog();
        claim.setMessageUuid(UUID);
        claim.setChannel(NotificationLog.Channel.EMAIL);
        return claim;
    }

    private MailMessage newMessage() {
        return new MailMessage(
                "hung@example.com",
                "Verify your Price Stalker email",
                "<p>code</p>",
                "code",
                "support@pricestalker.com"
        );
    }

    @Test
    void happyPathClaimsSendsAndMarksSent() {
        NotificationLog claim = newClaim();
        MailMessage message = newMessage();

        // null for the claim phase, the claim row for markSent's re-fetch.
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(mailProvider.send(message)).thenReturn("pmid");

        emailOutbox.dispatch(claim, message, "alert:email-verification");

        verify(notificationLogRepository).saveAndFlush(claim);
        verify(mailProvider).send(message);
        assertThat(claim.getStatus()).isEqualTo(NotificationLog.Status.SENT);
        assertThat(claim.getProviderMessageId()).isEqualTo("pmid");
    }

    @Test
    void duplicateMessageUuidSkipsWithoutSending() {
        NotificationLog claim = newClaim();
        MailMessage message = newMessage();

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(new NotificationLog());

        emailOutbox.dispatch(claim, message, "alert:email-verification");

        verifyNoInteractions(mailProvider);
        verify(notificationLogRepository, never()).saveAndFlush(any(NotificationLog.class));
    }

    @Test
    void cleanFailureReleasesClaim() {
        NotificationLog claim = newClaim();
        MailMessage message = newMessage();

        // null for the claim phase, the claim row for the release re-fetch.
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(mailProvider.send(message))
                .thenThrow(new MailSendException("connect failed", new ConnectException("refused")));

        assertThatThrownBy(() -> emailOutbox.dispatch(claim, message, "alert:email-verification"))
                .isInstanceOf(RuntimeException.class);

        // release deletes the SENDING row (tryClaim set status SENDING).
        verify(notificationLogRepository).delete(claim);
        assertThat(claim.getStatus()).isNotEqualTo(NotificationLog.Status.SENT);
    }

    @Test
    void ambiguousFailureMarksFailedAndKeeps() {
        NotificationLog claim = newClaim();
        MailMessage message = newMessage();

        // null for the claim phase, the claim row for the markFailed re-fetch.
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(null, claim);
        when(mailProvider.send(message))
                .thenThrow(new MailSendException("timeout", new SocketTimeoutException("read timed out")));

        assertThatThrownBy(() -> emailOutbox.dispatch(claim, message, "alert:email-verification"))
                .isInstanceOf(RuntimeException.class);

        verify(notificationLogRepository, never()).delete(any(NotificationLog.class));
        verify(notificationLogRepository).save(claim);
        assertThat(claim.getStatus()).isEqualTo(NotificationLog.Status.FAILED);
    }

    @Test
    void definitelyNotDeliveredClassifiesCauses() {
        assertThat(EmailOutbox.definitelyNotDelivered(new ConnectException())).isTrue();
        assertThat(EmailOutbox.definitelyNotDelivered(new jakarta.mail.SendFailedException())).isTrue();
        assertThat(EmailOutbox.definitelyNotDelivered(
                new IllegalStateException("Resend send failed with HTTP 500: oops"))).isTrue();

        assertThat(EmailOutbox.definitelyNotDelivered(new SocketTimeoutException())).isFalse();
        assertThat(EmailOutbox.definitelyNotDelivered(new RuntimeException("???"))).isFalse();
    }

    @Test
    void reclaimsStaleSendingClaimAndResends() {
        // A SENDING row left behind by a worker that died before reaching a terminal state.
        NotificationLog stale = new NotificationLog();
        stale.setMessageUuid(UUID);
        stale.setChannel(NotificationLog.Channel.EMAIL);
        stale.setStatus(NotificationLog.Status.SENDING);
        stale.setSentAt(LocalDateTime.now().minusMinutes(30));

        MailMessage message = newMessage();
        // existing for the claim phase (reclaim), and again for markSent's re-fetch.
        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(stale, stale);
        when(mailProvider.send(message)).thenReturn("pmid-2");

        emailOutbox.dispatch(newClaim(), message, "alert:email-verification");

        // re-drove the stale claim: refreshed it, re-sent, and marked SENT.
        verify(notificationLogRepository).saveAndFlush(stale);
        verify(mailProvider).send(message);
        assertThat(stale.getStatus()).isEqualTo(NotificationLog.Status.SENT);
        assertThat(stale.getProviderMessageId()).isEqualTo("pmid-2");
    }

    @Test
    void skipsRecentInFlightSendingClaim() {
        // A SENDING row that is still fresh — another attempt is in flight, so do not re-send.
        NotificationLog inFlight = new NotificationLog();
        inFlight.setMessageUuid(UUID);
        inFlight.setChannel(NotificationLog.Channel.EMAIL);
        inFlight.setStatus(NotificationLog.Status.SENDING);
        inFlight.setSentAt(LocalDateTime.now());

        when(notificationLogRepository.findByMessageUuid(UUID)).thenReturn(inFlight);

        emailOutbox.dispatch(newClaim(), newMessage(), "alert:email-verification");

        verifyNoInteractions(mailProvider);
        verify(notificationLogRepository, never()).saveAndFlush(any(NotificationLog.class));
        verify(notificationLogRepository, never()).delete(any(NotificationLog.class));
    }
}
