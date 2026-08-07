package com.pricestalker.core.repository;

import com.pricestalker.core.entity.Website;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WebsiteRepository extends JpaRepository<Website, String>{
	@Query("SELECT w FROM Website w WHERE " +
			"LOWER(:url) LIKE LOWER(CONCAT('%', w.domain, '%'))")
	Website findOneByUrl(@Param("url") String url);
}
