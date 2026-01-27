package com.pricestalker.bot.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.Website;

public interface WebsiteRepository extends JpaRepository<Website, String>{

}
