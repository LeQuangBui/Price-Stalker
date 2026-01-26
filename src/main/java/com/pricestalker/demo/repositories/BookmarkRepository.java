package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, String>{

}
