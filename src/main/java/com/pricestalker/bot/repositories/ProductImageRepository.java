package com.pricestalker.bot.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.ProductImage;

public interface ProductImageRepository extends JpaRepository<ProductImage, String>{
	
}
