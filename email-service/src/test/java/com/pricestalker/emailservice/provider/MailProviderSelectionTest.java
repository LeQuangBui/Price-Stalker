package com.pricestalker.emailservice.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.net.http.HttpClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class MailProviderSelectionTest {

    private static final String API_KEY = "re_test_key";
    private static final String BASE_URL = "https://api.resend.com";
    private static final String FROM = "alerts@price-stalker.com";
    private static final String REPLY_TO = "support@price-stalker.com";

    @Mock
    private ObjectProvider<JavaMailSenderImpl> mailSenderProvider;

    @Mock
    private JavaMailSenderImpl javaMailSender;

    private MailProviderConfig config;
    private HttpClient resendHttpClient;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        config = new MailProviderConfig();
        resendHttpClient = HttpClient.newHttpClient();
        objectMapper = new ObjectMapper();
    }

    private MailProvider select(String provider) {
        return config.mailProvider(
                provider,
                mailSenderProvider,
                resendHttpClient,
                objectMapper,
                API_KEY,
                BASE_URL,
                FROM,
                REPLY_TO
        );
    }

    @Test
    void resendProviderSelectsResendMailProvider() {
        MailProvider result = select("resend");

        assertThat(result).isInstanceOf(ResendMailProvider.class);
    }

    @Test
    void unsetOrUnknownProviderDefaultsToResendMailProvider() {
        MailProvider result = select("");

        assertThat(result).isInstanceOf(ResendMailProvider.class);
    }

    @Test
    void smtpProviderWithAvailableMailSenderSelectsSmtpMailProvider() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(javaMailSender);

        MailProvider result = select("smtp");

        assertThat(result).isInstanceOf(SmtpMailProvider.class);
    }

    @Test
    void smtpProviderWithoutMailSenderThrowsIllegalStateException() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);

        assertThatThrownBy(() -> select("smtp"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.mail.host");
    }
}
