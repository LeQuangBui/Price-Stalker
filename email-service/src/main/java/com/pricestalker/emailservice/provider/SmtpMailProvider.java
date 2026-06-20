package com.pricestalker.emailservice.provider;

import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Sends mail through a self-hosted Postfix relay via Spring's JavaMailSender.
 *
 * Mirrors {@link ResendMailProvider}'s contract so it drops into the same MailProvider
 * seam: a send failure THROWS (the @Transactional listener rolls back and the message
 * dead-letters — eng review Issue 1A), and the returned String is stored as
 * notification_log.provider_message_id.
 *
 *   MailMessage ──▶ MimeMessage (multipart/alternative: text + html)
 *                     │ own Message-ID set and PRESERVED (JavaMail won't regenerate it,
 *                     │ via the updateMessageID() override below)
 *                     ▼
 *                  JavaMailSender.send() ──▶ Postfix :25 (internal, network-trust)
 *                     │ MailException (connect refused / timeout / SMTP reject) → propagates
 *
 * NOTE (eng review): SMTP "send() returned" means Postfix ACCEPTED the message for
 * queuing, not that it was delivered. A later async bounce does not propagate here.
 * See the design doc "Delivery semantics" section.
 */
public class SmtpMailProvider implements MailProvider {
    private final JavaMailSenderImpl mailSender;
    private final String from;
    private final String defaultReplyTo;
    private final String messageIdDomain;

    public SmtpMailProvider(JavaMailSenderImpl mailSender, String from, String defaultReplyTo) {
        this.mailSender = mailSender;
        this.from = from;
        this.defaultReplyTo = defaultReplyTo;
        this.messageIdDomain = messageIdDomain(from);
    }

    @Override
    public String send(MailMessage message) {
        String messageId = "<" + UUID.randomUUID() + "@" + this.messageIdDomain + ">";
        try {
            MimeMessage mime = new MessageIdPreservingMimeMessage(this.mailSender.getSession(), messageId);
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(this.from);
            helper.setTo(message.to());
            helper.setSubject(message.subject());

            // multipart/alternative — plain text first, html second; mail clients render the
            // richest part they support. A text part also improves deliverability (Issue from §9).
            String text = hasText(message.textBody()) ? message.textBody() : htmlToText(message.htmlBody());
            helper.setText(text, message.htmlBody());

            String replyTo = hasText(message.replyTo()) ? message.replyTo() : this.defaultReplyTo;
            if (hasText(replyTo)) {
                helper.setReplyTo(replyTo);
            }

            this.mailSender.send(mime);
            return messageId;
        } catch (MessagingException ex) {
            // message construction failure (bad address, encoding) — surface like a send failure
            // so the @Transactional listener rolls back rather than logging SENT for nothing.
            throw new IllegalStateException("Failed to build SMTP message for " + message.to(), ex);
        } catch (MailException ex) {
            // connect refused / timeout / SMTP rejection — propagate so the listener dead-letters.
            throw ex;
        }
    }

    private static String messageIdDomain(String from) {
        if (from == null) {
            return "price-stalker";
        }
        int at = from.lastIndexOf('@');
        if (at < 0 || at == from.length() - 1) {
            return "price-stalker";
        }
        // strip a trailing '>' from "Name <user@domain>" form
        String domain = from.substring(at + 1).trim();
        if (domain.endsWith(">")) {
            domain = domain.substring(0, domain.length() - 1);
        }
        return domain.isBlank() ? "price-stalker" : domain;
    }

    /**
     * Best-effort plain-text fallback for the rare case a caller passes no textBody.
     * The listeners always render a real .txt template, so this is a safety net, not the
     * primary text source (a naive tag-strip is acceptable here precisely because it is
     * never the path real emails take).
     */
    private static String htmlToText(String html) {
        if (html == null) {
            return "";
        }
        return html
            .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
            .replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)</p>", "\n\n")
            .replaceAll("<[^>]+>", "")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replaceAll("[ \\t]+", " ")
            .replaceAll("\\n{3,}", "\n\n")
            .trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * MimeMessage that keeps a caller-supplied Message-ID instead of letting JavaMail
     * regenerate one during saveChanges()/send(). This lets us return a stable id for
     * notification_log.provider_message_id (SMTP has no provider-assigned id like Resend).
     */
    private static final class MessageIdPreservingMimeMessage extends MimeMessage {
        private final String messageId;

        private MessageIdPreservingMimeMessage(Session session, String messageId) {
            super(session);
            this.messageId = messageId;
        }

        @Override
        protected void updateMessageID() throws MessagingException {
            setHeader("Message-ID", this.messageId);
        }
    }
}
