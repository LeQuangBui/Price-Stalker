package com.pricestalker.emailservice.service;

import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
public class TemplateRenderService {
    private final TemplateEngine templateEngine;

    public TemplateRenderService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    /**
     * Renders the HTML template (e.g. "welcome" → templates/welcome.html via the
     * Spring Boot default Thymeleaf resolver).
     */
    public String render(String templateName, Map<String, Object> model) {
        Context context = new Context();
        context.setVariables(model);
        return this.templateEngine.process(templateName, context);
    }

    /**
     * Renders the plain-text alternative (e.g. "welcome" → templates/welcome.txt via the
     * TEXT-mode resolver registered in TextTemplateConfig). The ".txt" suffix is what routes
     * the lookup to the text resolver (resolvablePattern "*.txt").
     */
    public String renderText(String templateName, Map<String, Object> model) {
        Context context = new Context();
        context.setVariables(model);
        return this.templateEngine.process(templateName + ".txt", context);
    }
}
