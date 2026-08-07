package com.pricestalker.core.repository;

import com.pricestalker.core.entity.PriceAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceAlertRepository extends JpaRepository<PriceAlert, String>{
    Page<PriceAlert> findAllByUserId(String userId, Pageable pageable);
    PriceAlert findByUserIdAndProductId(String userId, String productId);
    List<PriceAlert> findAllByProductIdAndActiveTrue(String productId);
}
