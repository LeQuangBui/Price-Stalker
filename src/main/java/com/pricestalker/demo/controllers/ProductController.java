package com.pricestalker.demo.controllers;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.services.ProductService;

@Controller
public class ProductController {
	@Autowired
	private ProductService productService;
	
	@PostMapping("/product")
	public void addProduct(@RequestParam String url) throws IOException {
		this.productService.addProduct(url);
	}
	
	@GetMapping("/")
	public String home(Model model) {
		List<Product> products = this.productService.getAllProducts();
		model.addAttribute("products", products);
		return "home";
	}
	
	@GetMapping("/product/{id}")
	public String getProduct(Model model, @PathVariable("id") String id) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		Product product = this.productService.getProduct(id);
		model.addAttribute("product", product);
		model.addAttribute("isAuthenticated", authentication.isAuthenticated());
		return "Product";
	}
	
	@GetMapping("/product/search")
	public ResponseEntity<ArrayList<String>> searchProducts(@RequestParam String searchText) {
		List<Product> foundProducts = this.productService.getProductBySearchText(searchText);
		ArrayList<String> names = new ArrayList<String>();
		if (!foundProducts.isEmpty()) {
			for (Product p: foundProducts) {
				names.add(p.getName());
			}
			return ResponseEntity.ok(names);
		} else {
			return ResponseEntity.noContent().build();
		}
	}
}
