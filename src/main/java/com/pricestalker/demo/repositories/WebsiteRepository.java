package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.Website;

public interface WebsiteRepository extends JpaRepository<Website, String>{

}
