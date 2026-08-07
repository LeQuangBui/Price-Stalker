package com.pricestalker.core.repository;

import com.pricestalker.core.entity.PriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, String>{
	List<PriceHistory> findAllByProductIdOrderByRecordedAtAsc(String productId);
	List<PriceHistory> findAllByProductIdAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(String productId, LocalDateTime time);
}
