package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.Suggestion;
import java.util.List;

public interface SuggestionRepository extends JpaRepository<Suggestion, String> {
    List<Suggestion> findByProduct(Product product);
}
