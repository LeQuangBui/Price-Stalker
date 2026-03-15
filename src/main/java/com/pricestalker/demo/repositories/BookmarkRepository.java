package com.pricestalker.demo.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.pricestalker.demo.entities.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, String>{
	@Query("SELECT a FROM Bookmark a WHERE " +
			"a.user.username = :username")
	Page<Bookmark> findByUsername(String username, Pageable pageable);
}
