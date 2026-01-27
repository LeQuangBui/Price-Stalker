package com.pricestalker.bot.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.PriceHistory;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, String>{

}
