package com.pricestalker.emailservice.outbox;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.PushSubscription;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.PushSubscriptionRepository;
import com.pricestalker.emailservice.provider.WebPushProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Per-subscription claim-before-send for web push, mirroring {@link EmailOutbox} but with the
 * HTTP-status failure taxonomy (H6). A duplicate push is harmless, so on a transient failure we
 * RELEASE the claim and rethrow → the retry re-sends (favor delivery). On a permanent failure
 * (dead endpoint / config bug) we keep a FAILED row and ack (no pointless retry). A SENDING row
 * left behind by a crashed worker is reclaimed after {@link #STALE_CLAIM_AFTER} so a redelivery
 * re-drives it instead of silently skipping (which would drop the push).
 *
 * <pre>
 *   2xx              -> SENT
 *   404 / 410        -> prune the subscription + FAILED (endpoint gone; do not retry)
 *   429 / 5xx        -> RELEASE claim + rethrow -> retry/DLQ (transient)
 *   IOException      -> RELEASE claim + rethrow -> retry/DLQ (network)
 *   other 4xx / crypto-> FAILED + ALERT log (VAPID/payload bug; do not retry)
 * </pre>
 */
@Service
public class PushOutbox {
    private static final Logger log = LoggerFactory.getLogger(PushOutbox.class);

    /** A SENDING row older than this is treated as abandoned (worker died mid-send) and re-driven. */
    private static final Duration STALE_CLAIM_AFTER = Duration.ofMinutes(10);

    private final NotificationLogRepository notificationLogRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final WebPushProvider webPushProvider;
    private final TransactionTemplate requiresNew;

    public PushOutbox(
        NotificationLogRepository notificationLogRepository,
        PushSubscriptionRepository pushSubscriptionRepository,
        WebPushProvider webPushProvider,
        PlatformTransactionManager transactionManager
    ) {
        this.notificationLogRepository = notificationLogRepository;
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.webPushProvider = webPushProvider;
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * @param claim a NotificationLog with user/alert/product/channel=PUSH/eventId/messageUuid set
     *              by the caller; this method owns status and sentAt.
     */
    public void dispatch(NotificationLog claim, PushSubscription subscription, byte[] payload, String label) {
        String messageUuid = claim.getMessageUuid();

        Boolean claimed = this.requiresNew.execute(s -> tryClaim(claim));
        if (claimed == null || !claimed) {
            log.info("push_sent template={} outcome=skipped-duplicate messageUuid={}", label, messageUuid);
            return;
        }

        int status;
        try {
            status = this.webPushProvider.send(
                subscription.getEndpoint(), subscription.getP256dh(), subscription.getAuth(), payload);
        } catch (IOException networkFailure) {
            this.requiresNew.executeWithoutResult(s -> release(messageUuid));
            log.warn("push_sent template={} outcome=transient-released messageUuid={} error={}",
                label, messageUuid, networkFailure.toString());
            throw new RuntimeException("push transient network failure", networkFailure);   // -> retry/DLQ
        } catch (IllegalStateException configBug) {
            this.requiresNew.executeWithoutResult(s -> markFailed(messageUuid));
            log.error("push_sent template={} outcome=config-bug-ALERT messageUuid={} error={}",
                label, messageUuid, configBug.toString());
            return;                                                                     // do not retry
        }

        if (status >= 200 && status < 300) {
            this.requiresNew.executeWithoutResult(s -> markSent(messageUuid, String.valueOf(status)));
            this.requiresNew.executeWithoutResult(s -> touchSubscription(subscription.getEndpointHash()));
            log.info("push_sent template={} outcome=success status={} messageUuid={}", label, status, messageUuid);
        } else if (status == 404 || status == 410) {
            this.requiresNew.executeWithoutResult(s -> markFailed(messageUuid));
            this.requiresNew.executeWithoutResult(s -> pruneSubscription(subscription.getEndpointHash()));
            log.info("push_sent template={} outcome=endpoint-gone-pruned status={} messageUuid={}",
                label, status, messageUuid);
        } else if (status == 429 || status >= 500) {
            this.requiresNew.executeWithoutResult(s -> release(messageUuid));
            log.warn("push_sent template={} outcome=transient-status-released status={} messageUuid={}",
                label, status, messageUuid);
            throw new RuntimeException("push transient status " + status);              // -> retry/DLQ
        } else {
            this.requiresNew.executeWithoutResult(s -> markFailed(messageUuid));
            log.error("push_sent template={} outcome=non-retryable-ALERT status={} messageUuid={}",
                label, status, messageUuid);
        }
    }

    private boolean tryClaim(NotificationLog claim) {
        NotificationLog existing = this.notificationLogRepository.findByMessageUuid(claim.getMessageUuid());
        if (existing != null) {
            // Terminal (SENT) or a deliberately-kept failure (FAILED) → do not re-send.
            if (existing.getStatus() != NotificationLog.Status.SENDING) {
                return false;
            }
            // A fresh SENDING row means a send is in flight (or just finished, pending markSent) → skip.
            if (!isStaleClaim(existing)) {
                return false;
            }
            // A SENDING row older than STALE_CLAIM_AFTER means the worker died between the claim and
            // a terminal state. Re-drive it rather than leave a stranded row that would silently drop
            // the push on redelivery (a duplicate push is harmless). Mirrors EmailOutbox.
            log.warn("push_outbox reclaiming stale SENDING claim messageUuid={}", existing.getMessageUuid());
            existing.setSentAt(LocalDateTime.now());
            this.notificationLogRepository.saveAndFlush(existing);
            return true;
        }
        claim.setStatus(NotificationLog.Status.SENDING);
        claim.setSentAt(LocalDateTime.now());
        try {
            this.notificationLogRepository.saveAndFlush(claim);
            return true;
        } catch (DataIntegrityViolationException raced) {
            return false;   // a concurrent consumer won the unique(message_uuid) claim
        }
    }

    private boolean isStaleClaim(NotificationLog row) {
        return row.getSentAt() != null
            && row.getSentAt().isBefore(LocalDateTime.now().minus(STALE_CLAIM_AFTER));
    }

    private void markSent(String messageUuid, String providerStatus) {
        NotificationLog row = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (row == null) return;
        row.setStatus(NotificationLog.Status.SENT);
        row.setProviderMessageId(providerStatus);
        row.setSentAt(LocalDateTime.now());
        this.notificationLogRepository.save(row);
    }

    private void markFailed(String messageUuid) {
        NotificationLog row = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (row != null && row.getStatus() == NotificationLog.Status.SENDING) {
            row.setStatus(NotificationLog.Status.FAILED);
            this.notificationLogRepository.save(row);
        }
    }

    private void release(String messageUuid) {
        NotificationLog row = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (row != null && row.getStatus() == NotificationLog.Status.SENDING) {
            this.notificationLogRepository.delete(row);
        }
    }

    private void pruneSubscription(String endpointHash) {
        this.pushSubscriptionRepository.findByEndpointHash(endpointHash)
            .ifPresent(this.pushSubscriptionRepository::delete);
    }

    private void touchSubscription(String endpointHash) {
        this.pushSubscriptionRepository.findByEndpointHash(endpointHash).ifPresent(sub -> {
            sub.setLastSuccessAt(LocalDateTime.now());
            this.pushSubscriptionRepository.save(sub);
        });
    }
}
