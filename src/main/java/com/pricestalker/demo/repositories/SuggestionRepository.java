package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.Suggestion;


public interface SuggestionRepository extends JpaRepository<Suggestion, String> {

}
