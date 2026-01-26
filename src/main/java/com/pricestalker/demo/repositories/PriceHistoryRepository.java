package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.PriceHistory;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, String>{

}
