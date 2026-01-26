package com.pricestalker.demo.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.services.ProductService;

@Controller
public class ProductController {
	@Autowired
	private ProductService productService;
	
	@GetMapping("/")
	public String home(Model model) {
		List<Product> products = this.productService.getAllProducts();
		model.addAttribute("products", products);
		return "Products";
	}
	
	@GetMapping("/product/{id}")
	public String getProduct(Model model, @PathVariable("id") String id) {
		Product product = this.productService.getProduct(id);
		model.addAttribute("product", product);
		return "Product";
	}
}
