package com.pricestalker.emailservice.outbox;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.emailservice.provider.MailMessage;
import com.pricestalker.emailservice.provider.MailProvider;
import jakarta.mail.SendFailedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.ConnectException;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Transactional-outbox dispatch for transactional email. Closes the duplicate-send race that the
 * naive send-then-log listener had (eng review Issue 2C): a retry that re-runs a @Transactional
 * listener which sends BEFORE it commits the log row re-sends on a post-accept failure.
 *
 * Delivery guarantee: no-duplicate in steady state, but AT-LEAST-ONCE on the crash-during-send
 * path — if the worker dies after send() returns but before markSent commits, the stale-claim
 * reclaim (see STALE_CLAIM_AFTER) re-drives and may re-send. Deliberate: favors delivery over
 * no-duplicate (a lost verification code is worse than a duplicate one).
 *
 * <pre>
 *   dispatch(claim, message)
 *     1. CLAIM   — commit a NotificationLog{status=SENDING} in its OWN transaction (REQUIRES_NEW)
 *                  BEFORE sending. If a row for this messageUuid already exists → skip (dedup).
 *     2. SEND    — mailProvider.send(message)
 *     3a. ok     — mark the row SENT (+ providerMessageId), own transaction.
 *     3b. fail   — classify:
 *           definitely-not-delivered (connect refused / recipient rejected / Resend non-2xx / build
 *               failure) → RELEASE the claim (delete) and rethrow → the retry re-sends cleanly.
 *               No loss, no duplicate.
 *           ambiguous (post-accept timeout, mid-stream IO) → KEEP the claim as FAILED and rethrow →
 *               the retry's claim sees the row and skips. No duplicate; the rare true-loss is
 *               visible as a FAILED row. (We favor "no duplicate" here because a duplicate
 *               verification code is harmless; a lost one is not — and SMTP cannot tell us which
 *               an ambiguous timeout was.)
 * </pre>
 *
 * Uses a programmatic REQUIRES_NEW TransactionTemplate (not @Transactional) so each step commits
 * independently and there is no self-invocation proxy trap — the orchestration itself is not
 * transactional.
 */
@Service
public class EmailOutbox {
    private static final Logger log = LoggerFactory.getLogger(EmailOutbox.class);

    // A SENDING claim older than this is treated as abandoned (the worker died between the claim
    // commit and a terminal state — crash/OOM/redeploy) and is re-driven on the next redelivery.
    // Favors delivery over no-duplicate, matching "a lost verification code is worse than a
    // duplicate one." Much larger than the send timeout (~10s) + retry budget so it never races a
    // genuinely in-flight send.
    private static final Duration STALE_CLAIM_AFTER = Duration.ofMinutes(10);

    private final NotificationLogRepository notificationLogRepository;
    private final MailProvider mailProvider;
    private final TransactionTemplate requiresNew;

    public EmailOutbox(
        NotificationLogRepository notificationLogRepository,
        MailProvider mailProvider,
        PlatformTransactionManager transactionManager
    ) {
        this.notificationLogRepository = notificationLogRepository;
        this.mailProvider = mailProvider;
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * @param claim   a NotificationLog with user/alert/product/channel/messageUuid set by the caller;
     *                this method owns status and sentAt.
     * @param message the email to send if the claim is won.
     * @param label   a short tag for the structured log line (e.g. "alert:email-verification").
     */
    public void dispatch(NotificationLog claim, MailMessage message, String label) {
        String messageUuid = claim.getMessageUuid();

        Boolean claimed = this.requiresNew.execute(status -> tryClaim(claim));
        if (claimed == null || !claimed) {
            log.info("email_sent template={} outcome=skipped-duplicate messageUuid={}", label, messageUuid);
            return;
        }

        String providerMessageId;
        try {
            providerMessageId = this.mailProvider.send(message);
        } catch (RuntimeException ex) {
            if (definitelyNotDelivered(ex)) {
                this.requiresNew.executeWithoutResult(s -> release(messageUuid));
                log.warn("email_sent template={} outcome=failure-released messageUuid={} error={}",
                    label, messageUuid, ex.toString());
            } else {
                this.requiresNew.executeWithoutResult(s -> markFailed(messageUuid));
                log.warn("email_sent template={} outcome=failure-ambiguous-kept messageUuid={} error={}",
                    label, messageUuid, ex.toString());
            }
            throw ex;
        }

        this.requiresNew.executeWithoutResult(s -> markSent(messageUuid, providerMessageId));
        log.info("email_sent template={} outcome=success messageUuid={}", label, messageUuid);
    }

    private boolean tryClaim(NotificationLog claim) {
        NotificationLog existing = this.notificationLogRepository.findByMessageUuid(claim.getMessageUuid());
        if (existing != null) {
            // Terminal (SENT) or a deliberately-kept ambiguous failure (FAILED) → do not re-send.
            if (existing.getStatus() != NotificationLog.Status.SENDING) {
                return false;
            }
            // A fresh SENDING claim means a send is in flight (or just finished, pending markSent)
            // → skip to avoid a duplicate.
            if (!isStaleClaim(existing)) {
                return false;
            }
            // A SENDING claim older than STALE_CLAIM_AFTER means the worker died between the claim
            // and the terminal state. Re-drive it (refresh the claim and re-send) rather than leave
            // a stranded row that would silently drop the message on redelivery.
            log.warn("email_outbox reclaiming stale SENDING claim messageUuid={}", existing.getMessageUuid());
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
            // a concurrent consumer won the unique(message_uuid) claim — treat as duplicate.
            return false;
        }
    }

    private boolean isStaleClaim(NotificationLog row) {
        return row.getSentAt() != null
            && row.getSentAt().isBefore(LocalDateTime.now().minus(STALE_CLAIM_AFTER));
    }

    private void markSent(String messageUuid, String providerMessageId) {
        NotificationLog row = this.notificationLogRepository.findByMessageUuid(messageUuid);
        if (row == null) {
            return;
        }
        row.setStatus(NotificationLog.Status.SENT);
        row.setProviderMessageId(providerMessageId);
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

    /**
     * True only when we are confident the message was NOT handed off to a recipient MTA, so the
     * retry can re-send without risking a duplicate. Ambiguous failures (timeouts, mid-stream IO)
     * return false so the claim is kept and the retry dedups instead.
     */
    static boolean definitelyNotDelivered(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConnectException) {
                return true;                       // TCP connect refused — never reached the server
            }
            if (cause instanceof SendFailedException) {
                return true;                       // recipient rejected — explicitly not delivered
            }
            if ("MailConnectException".equals(cause.getClass().getSimpleName())) {
                return true;                       // Jakarta/Angus mail connect failure
            }
            String message = cause.getMessage();
            if (message != null
                && (message.contains("Resend send failed with HTTP")   // Resend returned non-2xx → rejected
                    || message.startsWith("Failed to build SMTP message"))) {  // built nothing → never sent
                return true;
            }
            if (cause.getCause() == cause) {
                break;                             // defensive: stop on a self-referential cause loop
            }
        }
        return false;
    }
}
