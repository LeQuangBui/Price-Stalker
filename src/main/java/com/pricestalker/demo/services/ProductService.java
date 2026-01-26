package com.pricestalker.demo.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.repositories.ProductRepository;

@Component
public class ProductService {
	@Autowired
	private ProductRepository productRepository;
	
	public void addProduct(Product p) {
		this.productRepository.save(p);
	}
	
	public List<Product> getAllProducts() {
		List<Product> products = (List<Product>) this.productRepository.findAll();
		return products;
	}
	
	public Product getProduct(String id) {
		Optional<Product> optional = this.productRepository.findById(id);
		Product product = optional.get();
		return product;
	}
	
	public void updateProduct(Product p, String id) {
		p.setId(id);
		Optional<Product> optional = this.productRepository.findById(id);
		Product product = optional.get();
		
		if (product.getId() == id) {
			this.productRepository.save(p);
		}
	}
	
	public void deleteProduct(String id) {
		this.productRepository.deleteById(id);
	}
}
