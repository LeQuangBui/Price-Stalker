package com.pricestalker.emailservice.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

public class ResendMailProvider implements MailProvider {
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String from;
    private final String defaultReplyTo;

    public ResendMailProvider(
        HttpClient httpClient,
        ObjectMapper objectMapper,
        String apiKey,
        String baseUrl,
        String from,
        String defaultReplyTo
    ) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.from = from;
        this.defaultReplyTo = defaultReplyTo;
    }

    @Override
    public String send(MailMessage message) {
        if (!hasText(this.apiKey)) {
            throw new IllegalStateException("mail.resend.api-key must be configured for real email delivery");
        }

        try {
            String payload = buildPayload(message);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(this.baseUrl + "/emails"))
                .header("Authorization", "Bearer " + this.apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

            HttpResponse<String> response = this.httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                    "Resend send failed with HTTP " + response.statusCode() + ": " + response.body()
                );
            }

            JsonNode responseBody = this.objectMapper.readTree(response.body());
            JsonNode id = responseBody.get("id");
            return id != null && !id.isNull() ? id.asText() : UUID.randomUUID().toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to serialize or parse Resend payload", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while sending Resend email", ex);
        }
    }

    private String buildPayload(MailMessage message) throws IOException {
        String replyTo = hasText(message.replyTo()) ? message.replyTo() : this.defaultReplyTo;

        JsonNode root = this.objectMapper.createObjectNode()
            .put("from", this.from)
            .put("subject", message.subject())
            .put("html", message.htmlBody());
        ((com.fasterxml.jackson.databind.node.ObjectNode) root).putArray("to").add(message.to());

        if (hasText(message.textBody())) {
            ((com.fasterxml.jackson.databind.node.ObjectNode) root).put("text", message.textBody());
        }

        if (hasText(replyTo)) {
            ((com.fasterxml.jackson.databind.node.ObjectNode) root).put("reply_to", replyTo);
        }

        return this.objectMapper.writeValueAsString(root);
    }

    private static String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
