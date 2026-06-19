package com.pricestalker.cronservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EntityScan("com.pricestalker.core.entity")
@EnableJpaRepositories("com.pricestalker.core.repository")
public class CronServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CronServiceApplication.class, args);
    }

}
