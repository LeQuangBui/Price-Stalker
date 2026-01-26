package com.pricestalker.demo.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.Website;

public interface ProductRepository extends JpaRepository<Product, String> {
	List<Product> findByWebsite(Website website);
}
