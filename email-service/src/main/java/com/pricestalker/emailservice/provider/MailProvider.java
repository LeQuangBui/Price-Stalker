package com.pricestalker.emailservice.provider;

public interface MailProvider {
    String send(MailMessage message);
}
