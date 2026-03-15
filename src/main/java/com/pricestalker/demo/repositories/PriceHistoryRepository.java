package com.pricestalker.demo.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.pricestalker.demo.entities.PriceHistory;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, String>{
	@Query("SELECT a FROM PriceHistory a WHERE a.product.id = :productId order by a.recordedAt ASC")
	List<PriceHistory> findAllByProductId(String productId);
	
	@Query("SELECT a FROM PriceHistory a WHERE " +
			"a.product.id = :productId AND " +
			"a.recordedAt > :time " +
			"order by a.recordedAt ASC")
	List<PriceHistory> findAllByProductIdAfter(String productId, LocalDateTime time);
}
