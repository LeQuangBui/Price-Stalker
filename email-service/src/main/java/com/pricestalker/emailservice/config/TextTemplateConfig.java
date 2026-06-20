package com.pricestalker.emailservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.util.Set;

/**
 * Registers a Thymeleaf TEXT-mode resolver alongside Spring Boot's default HTML resolver,
 * so the same TemplateEngine renders both `welcome.html` (HTML) and `welcome.txt` (plain text).
 *
 * Disambiguation: this resolver only matches names ending in ".txt" (resolvablePatterns),
 * runs first (order 0), and uses checkExistence, so:
 *   - process("welcome")      → no match here → falls through to the HTML resolver → welcome.html
 *   - process("welcome.txt")  → matches → templates/welcome.txt rendered as TEXT
 *
 * Uses the core Thymeleaf ClassLoaderTemplateResolver (not the spring6/spring7 variant) to stay
 * robust across Spring Boot / Thymeleaf-spring package versions.
 */
@Configuration
public class TextTemplateConfig {

    @Bean
    public ClassLoaderTemplateResolver textTemplateResolver() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix("");                       // the ".txt" is part of the requested name
        resolver.setTemplateMode(TemplateMode.TEXT);
        resolver.setResolvablePatterns(Set.of("*.txt"));
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCheckExistence(true);
        resolver.setCacheable(true);
        resolver.setOrder(0);                          // try before the default HTML resolver
        return resolver;
    }
}
