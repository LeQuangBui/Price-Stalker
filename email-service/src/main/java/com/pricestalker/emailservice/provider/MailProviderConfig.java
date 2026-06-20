package com.pricestalker.emailservice.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class MailProviderConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public HttpClient resendHttpClient(
        @Value("${mail.resend.connect-timeout-seconds:10}") long connectTimeoutSeconds
    ) {
        return HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(Math.max(1L, connectTimeoutSeconds)))
            .build();
    }

    /**
     * Selects the mail provider by the {@code mail.provider} property ({@code smtp} | {@code resend},
     * default {@code resend}). Done with a plain switch on the value rather than
     * {@code @ConditionalOnProperty} so it stays robust across Spring Boot package moves, and so
     * exactly one MailProvider bean exists (no ambiguity). Flipping the property + redeploying
     * email-service is the 30-second fallback path.
     */
    @Bean
    public MailProvider mailProvider(
        @Value("${mail.provider:resend}") String provider,
        ObjectProvider<JavaMailSenderImpl> mailSenderProvider,
        HttpClient resendHttpClient,
        ObjectMapper objectMapper,
        @Value("${mail.resend.api-key:}") String apiKey,
        @Value("${mail.resend.base-url:https://api.resend.com}") String baseUrl,
        @Value("${mail.from:}") String from,
        @Value("${mail.reply-to:}") String replyTo
    ) {
        if ("smtp".equalsIgnoreCase(provider)) {
            JavaMailSenderImpl mailSender = mailSenderProvider.getIfAvailable();
            if (mailSender == null) {
                throw new IllegalStateException(
                    "mail.provider=smtp but no JavaMailSender is configured — set spring.mail.host (e.g. SMTP_HOST=postfix)"
                );
            }
            return new SmtpMailProvider(mailSender, from, replyTo);
        }
        return new ResendMailProvider(resendHttpClient, objectMapper, apiKey, baseUrl, from, replyTo);
    }
}
