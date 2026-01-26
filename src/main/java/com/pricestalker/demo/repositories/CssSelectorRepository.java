package com.pricestalker.demo.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.CssSelector;
import com.pricestalker.demo.entities.Website;

public interface CssSelectorRepository extends JpaRepository<CssSelector, String>{
	List<CssSelector> findByWebsiteAndFieldName(Website website, String fieldName);
}
