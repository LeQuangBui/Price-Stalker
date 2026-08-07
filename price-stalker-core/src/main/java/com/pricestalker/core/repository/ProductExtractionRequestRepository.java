package com.pricestalker.core.repository;

import com.pricestalker.core.entity.ProductExtractionRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductExtractionRequestRepository extends JpaRepository<ProductExtractionRequest, String> {
}
