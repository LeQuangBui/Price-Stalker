package com.pricestalker.demo.controllers;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pricestalker.demo.dtos.PriceHistoryRequestDto;
import com.pricestalker.demo.dtos.PriceHistoryResponseDto;
import com.pricestalker.demo.dtos.ProductRequestDto;
import com.pricestalker.demo.dtos.ProductResponseDto;
import com.pricestalker.demo.entities.PriceHistory;
import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.services.PriceHistoryService;
import com.pricestalker.demo.services.ProductService;

@RestController
public class ProductController {
	@Autowired
	private ProductService productService;
	
	@Autowired
	private PriceHistoryService priceHistoryService;
	
	@PostMapping("/products")
	public ResponseEntity<ProductResponseDto> addProduct(@RequestBody ProductRequestDto productRequestDto) throws IOException {
		Product product = this.productService.addProduct(productRequestDto);
		return ResponseEntity.ok(ProductResponseDto.from(product));
	}
	
	@GetMapping("/products/{id}")
	public ResponseEntity<ProductResponseDto> getProduct(@PathVariable String id) {
		Product product = this.productService.getProduct(id);
		return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponseDto.from(product));
	}
	
	@GetMapping("/products/{id}/price-histories")
	public ResponseEntity<List<PriceHistoryResponseDto>> getPriceHistories(
			@RequestParam(defaultValue = "1970-01-01T00:00:00")
			@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime after,
			@RequestParam boolean all,
			@PathVariable String id
	) {
		PriceHistoryRequestDto priceHistoryRequestDto = new PriceHistoryRequestDto(id, after, all);
		List<PriceHistory> priceHistories = this.priceHistoryService.getPriceHistories(priceHistoryRequestDto);
		List<PriceHistoryResponseDto> dtoList = new ArrayList<>();
		for (PriceHistory priceHistory: priceHistories) {
			dtoList.add(PriceHistoryResponseDto.from(priceHistory));
		}
		return ResponseEntity.ok(dtoList);
	}
	
	@GetMapping("/products")
	public ResponseEntity<Page<ProductResponseDto>> searchProducts(
			@RequestParam Optional<String> search, 
			@RequestParam Optional<String> url,
			@RequestParam Optional<String> website,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "DESC") String direction
	) {
		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sort));
		Page<Product> products;
		if (search.isPresent()) {
			products = this.productService.searchProduct(search, pageable);
		} else if (url.isPresent()) {
			products = this.productService.searchProductByUrl(url, pageable);
		} else if (website.isPresent()) {
			products = this.productService.searchProductByWebsite(website, pageable);
		} else {
			products = this.productService.getAllProducts(pageable);
		}
		
		Page<ProductResponseDto> dtoPage = products.map(ProductResponseDto::from); 
		return ResponseEntity.ok(dtoPage);
	}
}
