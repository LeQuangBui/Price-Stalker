package com.pricestalker.bot.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.Product;
import com.pricestalker.bot.entities.Website;

public interface ProductRepository extends JpaRepository<Product, String> {
	List<Product> findByWebsite(Website website);
}
