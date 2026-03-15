package com.pricestalker.bot.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.Product;
import com.pricestalker.bot.entities.Suggestion;


public interface SuggestionRepository extends JpaRepository<Suggestion, String> {
    List<Suggestion> findByProduct(Product product);
}
