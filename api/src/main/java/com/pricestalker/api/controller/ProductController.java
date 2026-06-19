package com.pricestalker.api.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.pricestalker.core.entity.PriceHistory;
import com.pricestalker.core.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.pricestalker.api.dto.priceHistory.PriceHistoryRequestDto;
import com.pricestalker.api.dto.priceHistory.PriceHistoryResponseDto;
import com.pricestalker.api.dto.product.ProductExtractionResponseDto;
import com.pricestalker.api.dto.product.ProductRequestDto;
import com.pricestalker.api.dto.product.ProductResponseDto;
import com.pricestalker.api.service.PriceHistoryService;
import com.pricestalker.api.service.ProductExtractionService;
import com.pricestalker.api.service.ProductService;
import com.pricestalker.core.entity.ProductExtractionRequest;

@RestController
@RequestMapping("/products")
public class ProductController {
	private final ProductService productService;
	private final PriceHistoryService priceHistoryService;
	private final ProductExtractionService productExtractionService;

    public ProductController(
			ProductService productService,
			PriceHistoryService priceHistoryService,
			ProductExtractionService productExtractionService
	) {
        this.productService = productService;
        this.priceHistoryService = priceHistoryService;
		this.productExtractionService = productExtractionService;
    }

    @PostMapping()
	public ResponseEntity<?> addProduct(@RequestBody ProductRequestDto dto) {
		this.productService.addProduct(dto);
		return ResponseEntity.ok().build();
	}

	@PostMapping("/extractions")
	public ResponseEntity<ProductExtractionResponseDto> createProductExtraction(@RequestBody ProductRequestDto dto) {
		ProductExtractionRequest request = this.productExtractionService.create(dto.getUrl());
		return ResponseEntity.accepted().body(ProductExtractionResponseDto.from(request));
	}

	@GetMapping("/extractions/{requestId}")
	public ResponseEntity<ProductExtractionResponseDto> getProductExtraction(@PathVariable String requestId) {
		ProductExtractionRequest request = this.productExtractionService.get(requestId);
		if (request == null) return ResponseEntity.notFound().build();
		return ResponseEntity.ok(ProductExtractionResponseDto.from(request));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ProductResponseDto> getProduct(@PathVariable String id) {
		Product product = this.productService.getProduct(id);
		if (product == null) return ResponseEntity.notFound().build();
		return ResponseEntity.ok(ProductResponseDto.from(product));
	}
	
	@GetMapping("/{id}/price-histories")
	public ResponseEntity<List<PriceHistoryResponseDto>> getPriceHistories(
			@PathVariable String id,
			@RequestParam(required = false)
			@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
			LocalDateTime after
	) {
		PriceHistoryRequestDto dto = new PriceHistoryRequestDto(id, after);
		List<PriceHistory> priceHistories = this.priceHistoryService.getPriceHistories(dto);
		List<PriceHistoryResponseDto> dtoList = new ArrayList<>();
		for (PriceHistory priceHistory: priceHistories) {
			dtoList.add(PriceHistoryResponseDto.from(priceHistory));
		}
		return ResponseEntity.ok(dtoList);
	}
	
	@GetMapping()
	public ResponseEntity<Page<ProductResponseDto>> searchProducts(
			@RequestParam(defaultValue = "") String search,
			@RequestParam(defaultValue = "") String url,
			@RequestParam(defaultValue = "") String website,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "DESC") String direction
	) {
		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sort));
		Page<Product> products;
		if (!search.isEmpty()) {
			products = this.productService.searchProduct(search, pageable);
		} else if (!url.isEmpty()) {
			products = this.productService.searchProductByUrl(url, pageable);
		} else if (!website.isEmpty()) {
			products = this.productService.searchProductByWebsite(website, pageable);
		} else {
			products = this.productService.getAllProducts(pageable);
		}
		return ResponseEntity.ok(products.map(ProductResponseDto::from));
	}
}
