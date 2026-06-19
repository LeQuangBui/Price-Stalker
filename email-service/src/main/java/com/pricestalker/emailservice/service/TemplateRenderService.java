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

    public String render(String templateName, Map<String, Object> model) {
        Context context = new Context();
        context.setVariables(model);
        return this.templateEngine.process(templateName, context);
    }
}
