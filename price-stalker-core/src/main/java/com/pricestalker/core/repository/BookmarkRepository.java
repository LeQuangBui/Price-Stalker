package com.pricestalker.core.repository;

import com.pricestalker.core.entity.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BookmarkRepository extends JpaRepository<Bookmark, String>{
	Page<Bookmark> findByUserId(String userId, Pageable pageable);
}
