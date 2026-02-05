package com.pricestalker.demo.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
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


	@Query("SELECT p from Product p WHERE LOWER(p.url) = LOWER(:searchLink)")
	List<Product> findBySearchLink(@Param("searchLink") String searchLink);
	
	
	
	@Query("""
    SELECT DISTINCT p
    FROM Product p
    LEFT JOIN FETCH p.productImages
    ORDER BY p.updatedAt DESC
	""")
	List<Product> findTrending(Pageable pageable);

}
