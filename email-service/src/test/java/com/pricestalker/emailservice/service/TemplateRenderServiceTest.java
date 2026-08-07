package com.pricestalker.emailservice.service;

import com.pricestalker.core.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves {@link TemplateRenderService#renderText} resolves and renders the real ".txt" TEXT-mode
 * templates, AND that the TEXT resolver (registered by TextTemplateConfig) does not shadow the HTML
 * resolver. Boots the real Spring context so it uses the production Thymeleaf engine (SpringEL via
 * the Spring dialect) — a hand-built {@code org.thymeleaf.TemplateEngine} would default to the OGNL
 * standard dialect, which Spring Boot's Thymeleaf starter does not ship.
 *
 * Same boot properties as EmailServiceApplicationTests: H2, Flyway off, Rabbit listeners disabled,
 * mail config present so the startup validator passes.
 */
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:tmpl;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=USER",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "spring.rabbitmq.dynamic=false",
    "spring.rabbitmq.listener.simple.auto-startup=false",
    "mail.from=no-reply@example.test",
    "mail.reply-to=support@example.test",
    "mail.resend.api-key=re_test_key"
})
class TemplateRenderServiceTest {

    @Autowired
    private TemplateRenderService templateRenderService;

    private static User user() {
        User user = new User("hung", "hung@example.com", "hashed");
        user.setId("user-1");
        return user;
    }

    @Test
    void renderTextResolvesEmailVerificationTemplate() {
        String output = templateRenderService.renderText("email-verification", Map.of(
            "user", user(),
            "verificationCode", "123456",
            "expiresInMinutes", 15
        ));

        assertThat(output)
            .contains("hung")
            .contains("123456")
            .contains("15");
    }

    @Test
    void renderTextResolvesWelcomeTemplate() {
        String output = templateRenderService.renderText("welcome", Map.of("user", user()));

        assertThat(output)
            .contains("hung")
            .contains("hung@example.com")
            .contains("Welcome to Price Stalker");
    }

    @Test
    void renderStillResolvesTheHtmlTemplate() {
        // The TEXT resolver matches only "*.txt", so render("welcome") must fall through to the
        // HTML resolver and produce welcome.html, not be shadowed by the TEXT resolver.
        String output = templateRenderService.render("welcome", Map.of("user", user()));

        assertThat(output).contains("Price Stalker");
        assertThat(output).contains("<");   // it's HTML, not the plain-text variant
    }
}
