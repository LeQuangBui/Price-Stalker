package com.pricestalker.cronservice.controller;

import com.pricestalker.cronservice.job.RefreshPricesJob;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Profile("dev")
@RestController
@RequestMapping("/admin")
public class AdminController {
    private final RefreshPricesJob refreshPricesJob;

    public AdminController(RefreshPricesJob refreshPricesJob) {
        this.refreshPricesJob = refreshPricesJob;
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh() {
        this.refreshPricesJob.refreshAllProducts();
        return ResponseEntity.accepted().build();
    }
}
