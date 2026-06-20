package com.pricestalker.emailservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves {@link TemplateRenderService#renderText} resolves and renders the real ".txt"
 * TEXT-mode templates that ship in src/main/resources/templates.
 *
 * No Spring context is required: we build a Thymeleaf {@link TemplateEngine} by hand,
 * wiring it with the same {@link ClassLoaderTemplateResolver} that
 * {@code TextTemplateConfig} registers (prefix "templates/", empty suffix, TEXT mode,
 * resolvablePatterns {"*.txt"}, checkExistence true), then wrap it in the real service.
 */
public class TemplateRenderServiceTest {

    private TemplateRenderService templateRenderService;

    @BeforeEach
    void setUp() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix("");
        resolver.setTemplateMode(TemplateMode.TEXT);
        resolver.setResolvablePatterns(Set.of("*.txt"));
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCheckExistence(true);
        // Disable caching so the test is deterministic across reruns within a JVM.
        resolver.setCacheable(false);
        resolver.setOrder(0);

        TemplateEngine engine = new TemplateEngine();
        engine.setTemplateResolver(resolver);

        templateRenderService = new TemplateRenderService(engine);
    }

    @Test
    void renderTextResolvesEmailVerificationTemplate() {
        Map<String, Object> model = new HashMap<>();
        model.put("user", new TemplateUser("hung", "hung@example.com"));
        model.put("verificationCode", "123456");
        model.put("expiresInMinutes", 15);

        String output = templateRenderService.renderText("email-verification", model);

        assertThat(output)
                .contains("hung")
                .contains("123456")
                .contains("15");
    }

    @Test
    void renderTextResolvesWelcomeTemplate() {
        Map<String, Object> model = new HashMap<>();
        model.put("user", new TemplateUser("hung", "hung@example.com"));

        String output = templateRenderService.renderText("welcome", model);

        assertThat(output)
                .contains("hung")
                .contains("hung@example.com")
                .contains("Welcome to Price Stalker");
    }

    /**
     * Minimal stand-in for the model's "user" object. Thymeleaf reads JavaBean getters,
     * so {@code [(${user.username})]} resolves to {@link #getUsername()}.
     */
    static final class TemplateUser {
        private final String username;
        private final String email;

        TemplateUser(String username, String email) {
            this.username = username;
            this.email = email;
        }

        public String getUsername() {
            return username;
        }

        public String getEmail() {
            return email;
        }
    }
}
