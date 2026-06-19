package com.pricestalker.emailservice.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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

    @Bean
    public MailProvider mailProvider(
        HttpClient resendHttpClient,
        ObjectMapper objectMapper,
        @Value("${mail.resend.api-key:}") String apiKey,
        @Value("${mail.resend.base-url:https://api.resend.com}") String baseUrl,
        @Value("${mail.from}") String from,
        @Value("${mail.reply-to:}") String replyTo
    ) {
        return new ResendMailProvider(resendHttpClient, objectMapper, apiKey, baseUrl, from, replyTo);
    }
}
