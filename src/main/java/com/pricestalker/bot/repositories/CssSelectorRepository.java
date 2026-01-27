package com.pricestalker.bot.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.CssSelector;
import com.pricestalker.bot.entities.Website;

public interface CssSelectorRepository extends JpaRepository<CssSelector, String>{
	List<CssSelector> findByWebsiteAndFieldName(Website website, String fieldName);
}
