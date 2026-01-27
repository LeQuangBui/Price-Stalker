package com.pricestalker.bot.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, String>{

}
