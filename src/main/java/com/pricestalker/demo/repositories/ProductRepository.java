package com.pricestalker.demo.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.Website;

public interface ProductRepository extends JpaRepository<Product, String> {
	List<Product> findByWebsite(Website website);
	
	@Query("SELECT a FROM Product a WHERE " +
			"LOWER(a.name) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
			"LOWER(a.url) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
			"LOWER(a.website.name) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
			"LOWER(a.currency) LIKE LOWER(CONCAT('%', :searchText, '%'))")
	List<Product> findBySearchText(@Param("searchText") String searchText);
}
