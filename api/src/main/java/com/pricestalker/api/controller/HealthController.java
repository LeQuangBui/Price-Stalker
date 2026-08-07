package com.pricestalker.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {
    @GetMapping("/healthz")
    Map<String, String> healthz() {
        return Map.of("status", "ok");
    }
}
