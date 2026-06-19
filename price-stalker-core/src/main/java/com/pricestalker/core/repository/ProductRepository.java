package com.pricestalker.core.repository;

import com.pricestalker.core.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String> {
	@Query("SELECT a FROM Product a WHERE " +
			"LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.url) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.sku) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.website.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
			"LOWER(a.currency) LIKE LOWER(CONCAT('%', :search, '%'))")
	Page<Product> findBySearchText(@Param("search") String search, Pageable pageable);
	Page<Product> findByUrl(String url, Pageable pageable);
	Page<Product> findByWebsiteNameContainingIgnoreCase(String website, Pageable pageable);

	Boolean existsByUrl(String url);
	Optional<Product> findFirstByUrl(String url);
}
