package com.pricestalker.emailservice.provider;

public record MailMessage(String to, String subject, String htmlBody, String textBody, String replyTo) {
}
