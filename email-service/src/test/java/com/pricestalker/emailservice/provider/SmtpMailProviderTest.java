package com.pricestalker.emailservice.provider;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.Address;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class SmtpMailProviderTest {

    private static final String FROM = "no-reply@price-stalker.test";
    private static final String DEFAULT_REPLY_TO = "support@price-stalker.test";

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP);

    private static JavaMailSenderImpl senderFor(int port) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("127.0.0.1");
        sender.setPort(port);
        return sender;
    }

    private static SmtpMailProvider providerFor(int port) {
        return new SmtpMailProvider(senderFor(port), FROM, DEFAULT_REPLY_TO);
    }

    /** Render an entire MimeMessage (headers + body) to a String for body/part assertions. */
    private static String rawSource(MimeMessage message) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        message.writeTo(out);
        return out.toString("UTF-8");
    }

    @Test
    void sendsMultipartAlternativeAndPreservesMessageId() throws Exception {
        SmtpMailProvider provider = providerFor(greenMail.getSmtp().getPort());

        String returnedId = provider.send(new MailMessage(
                "alice@price-stalker.test",
                "Your price dropped",
                "<p>html</p>",
                "plain text",
                null
        ));

        assertThat(returnedId).isNotNull();
        assertThat(returnedId).matches("<.+@price-stalker\\.test>");

        assertThat(greenMail.waitForIncomingEmail(5_000, 1)).isTrue();

        MimeMessage[] received = greenMail.getReceivedMessages();
        assertThat(received).hasSize(1);

        MimeMessage message = received[0];
        assertThat(message.getSubject()).isEqualTo("Your price dropped");

        Address[] fromAddresses = message.getFrom();
        assertThat(fromAddresses).hasSize(1);
        assertThat(fromAddresses[0].toString()).isEqualTo(FROM);

        Address[] recipients = message.getAllRecipients();
        assertThat(recipients).hasSize(1);
        assertThat(recipients[0].toString()).isEqualTo("alice@price-stalker.test");

        // MimeMessageHelper(mime, true, ...) uses MULTIPART_MODE_MIXED_RELATED, so the top-level
        // type is multipart/mixed wrapping multipart/related wrapping the multipart/alternative that
        // holds the text + html parts. Assert on the raw source (robust to the nesting) rather than
        // the top-level content-type.
        assertThat(message.getContentType()).containsIgnoringCase("multipart");
        String source = rawSource(message);
        assertThat(source).containsIgnoringCase("multipart/alternative");
        assertThat(source).contains("plain text");
        assertThat(source).contains("<p>html</p>");

        // The MessageIdPreservingMimeMessage must keep the id we returned for the caller.
        String[] messageIdHeader = message.getHeader("Message-ID");
        assertThat(messageIdHeader).isNotNull();
        assertThat(messageIdHeader).hasSize(1);
        assertThat(messageIdHeader[0]).isEqualTo(returnedId);
    }

    @Test
    void fallsBackToDefaultReplyToWhenNoneProvided() throws Exception {
        SmtpMailProvider provider = providerFor(greenMail.getSmtp().getPort());

        provider.send(new MailMessage(
                "bob@price-stalker.test",
                "No reply-to here",
                "<p>html</p>",
                "plain text",
                null
        ));

        assertThat(greenMail.waitForIncomingEmail(5_000, 1)).isTrue();

        MimeMessage message = greenMail.getReceivedMessages()[0];
        String[] replyTo = message.getHeader("Reply-To");
        assertThat(replyTo).isNotNull();
        assertThat(replyTo).hasSize(1);
        assertThat(replyTo[0]).isEqualTo(DEFAULT_REPLY_TO);
    }

    @Test
    void propagatesSendFailureWhenServerUnreachable() {
        // Point at a closed port so the SMTP connect is refused — the failure must propagate
        // (eng review Issue 1A) rather than being swallowed.
        SmtpMailProvider provider = providerFor(1);

        assertThatThrownBy(() -> provider.send(new MailMessage(
                "carol@price-stalker.test",
                "Should fail",
                "<p>html</p>",
                "plain text",
                null
        ))).isInstanceOf(RuntimeException.class);
    }
}
