package com.pricestalker.demo.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.Website;

public interface ProductRepository extends JpaRepository<Product, String> {
	@Query("SELECT a FROM Product a WHERE " +
			"LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.url) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.website.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.currency) LIKE LOWER(CONCAT('%', :search, '%'))")
	Page<Product> findBySearchText(@Param("search") Optional<String> search, Pageable pageable);
	
	Page<Product> findByUrl(Optional<String> url, Pageable pageable);
	
	@Query("SELECT a FROM Product a WHERE LOWER(a.website.name) LIKE LOWER(CONCAT('%', :website, '%'))")
	Page<Product> findByWebsite(Optional<String> website, Pageable pageable);
	
	Page<Product> findByWebsite(Website website, Pageable pageable);
	Boolean existsByUrl(String url);
}
