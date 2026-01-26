package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.ProductImage;

public interface ProductImageRepository extends JpaRepository<ProductImage, String>{
	
}
