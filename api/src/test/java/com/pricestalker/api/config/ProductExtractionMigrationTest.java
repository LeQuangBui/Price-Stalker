package com.pricestalker.api.config;

import com.pricestalker.core.entity.ProductExtractionRequest;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ProductExtractionMigrationTest {
    @Test
    void flywayStatusEnumMatchesApplicationStatusEnum() throws Exception {
        String migration = Files.readString(Path.of("src/main/resources/db/migration/V4__product_extraction_request.sql"));
        String normalized = migration.replaceAll("\\s+", " ");

        assertThat(normalized).contains("status ENUM");
        for (ProductExtractionRequest.Status status : ProductExtractionRequest.Status.values()) {
            assertThat(migration).contains("'" + status.name() + "'");
        }
    }
}
