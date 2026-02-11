package com.pricestalker.demo.controllers;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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
	
	@GetMapping("/product/{id}")
	public String getProduct(Model model, @PathVariable("id") String id) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		model.addAttribute("isAuthenticated", authentication.isAuthenticated());
		
		Product product = this.productService.getProduct(id);
		model.addAttribute("product", product);
		return "EachProduct/product";
	}
	
	@GetMapping("/product/search")
	public String searchProducts(Model model, @RequestParam String text) {
		List<Product> foundProducts = this.productService.getProductBySearchText(text);
		model.addAttribute("products", foundProducts);
		return "ManyProducts/products";
	}
	
	@GetMapping("/product/search_url")
	public String searchProductsViaLink(Model model, @RequestParam String url) throws IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		model.addAttribute("isAuthenticated", authentication.isAuthenticated());
		
		Product foundProduct = this.productService.getProductByUrl(url);
		if (foundProduct == null) foundProduct = this.productService.addProduct(url);
		model.addAttribute("product", foundProduct);
		return "EachProduct/product";
	}
}
