package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.pricestalker.demo.entities.Website;

public interface WebsiteRepository extends JpaRepository<Website, String>{
	@Query("SELECT w FROM Website w WHERE " +
			"LOWER(:url) LIKE LOWER(CONCAT('%', w.url, '%'))")
	Website findOneByUrl(@Param("url") String url);
}
