package com.pricestalker.api.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.validation.Valid;

import com.pricestalker.core.entity.PriceHistory;
import com.pricestalker.core.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.pricestalker.api.security.UserPrincipal;
import com.pricestalker.api.dto.priceHistory.PriceHistoryRequestDto;
import com.pricestalker.api.dto.priceHistory.PriceHistoryResponseDto;
import com.pricestalker.api.dto.product.ProductExtractionResponseDto;
import com.pricestalker.api.dto.product.ProductRequestDto;
import com.pricestalker.api.dto.product.ProductResponseDto;
import com.pricestalker.api.service.PriceHistoryService;
import com.pricestalker.api.service.ProductExtractionService;
import com.pricestalker.api.service.ProductService;
import com.pricestalker.core.entity.ProductExtractionRequest;
import org.springframework.validation.annotation.Validated;

@RestController
@RequestMapping("/products")
@Validated
public class ProductController {
	/** Allowlist of caller-supplied sort fields (real Product entity fields only) to avoid
	 *  request-driven 500s / property probing through Sort.by(...). */
	private static final Set<String> SORTABLE_FIELDS = Set.of(
		"createdAt", "updatedAt", "name", "price"
	);
	private static final String DEFAULT_SORT_FIELD = "createdAt";

	private static Sort safeSort(String field, String direction) {
		String safeField = (field != null && SORTABLE_FIELDS.contains(field)) ? field : DEFAULT_SORT_FIELD;
		Sort.Direction safeDirection = "ASC".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
		return Sort.by(safeDirection, safeField);
	}

	private final ProductService productService;
	private final PriceHistoryService priceHistoryService;
	private final ProductExtractionService productExtractionService;

	/** Per-user fixed-window rate limit on extraction submissions (defense-in-depth on top of auth). */
	private static final long EXTRACTION_WINDOW_MS = 60_000;
	private static final int EXTRACTION_MAX_PER_WINDOW = 20;
	private static final int EXTRACTION_MAX_TRACKED_KEYS = 50_000;
	private final ConcurrentHashMap<String, long[]> extractionRate = new ConcurrentHashMap<>();

    public ProductController(
			ProductService productService,
			PriceHistoryService priceHistoryService,
			ProductExtractionService productExtractionService
	) {
        this.productService = productService;
        this.priceHistoryService = priceHistoryService;
		this.productExtractionService = productExtractionService;
    }

	@PostMapping("/extractions")
	public ResponseEntity<ProductExtractionResponseDto> createProductExtraction(
			@Valid @RequestBody ProductRequestDto dto,
			@AuthenticationPrincipal UserPrincipal userPrincipal
	) {
		if (!isValidExtractionUrl(dto == null ? null : dto.getUrl())) {
			return ResponseEntity.badRequest().build();
		}
		if (!allowExtraction(userPrincipal.getId())) {
			return ResponseEntity.status(429).build();
		}
		ProductExtractionRequest request = this.productExtractionService.create(dto.getUrl().trim(), userPrincipal.getId());
		return ResponseEntity.accepted().body(ProductExtractionResponseDto.from(request));
	}

	// Reject junk before queueing crawler work: https only, real host, no embedded credentials,
	// bounded length. The crawler additionally enforces the retailer-domain allowlist.
	private static boolean isValidExtractionUrl(String raw) {
		if (raw == null) return false;
		String url = raw.trim();
		if (url.isEmpty() || url.length() > 2048) return false;
		try {
			java.net.URI uri = java.net.URI.create(url);
			return "https".equalsIgnoreCase(uri.getScheme())
				&& uri.getHost() != null
				&& uri.getUserInfo() == null;
		} catch (IllegalArgumentException malformed) {
			return false;
		}
	}

	private boolean allowExtraction(String userId) {
		long now = System.currentTimeMillis();
		// Bound memory (mirrors AuthRateLimitFilter): once the map grows large, drop entries whose
		// window has elapsed so a long-lived instance can't accumulate one stale entry per user who
		// ever submitted an extraction.
		if (this.extractionRate.size() > EXTRACTION_MAX_TRACKED_KEYS) {
			this.extractionRate.entrySet().removeIf(e -> now - e.getValue()[0] > EXTRACTION_WINDOW_MS);
		}
		long[] window = this.extractionRate.compute(userId, (key, current) -> {
			if (current == null || now - current[0] > EXTRACTION_WINDOW_MS) {
				return new long[]{ now, 1 };
			}
			current[1]++;
			return current;
		});
		return window[1] <= EXTRACTION_MAX_PER_WINDOW;
	}

	@GetMapping("/extractions/{requestId}")
	public ResponseEntity<ProductExtractionResponseDto> getProductExtraction(
			@PathVariable String requestId,
			@AuthenticationPrincipal UserPrincipal userPrincipal
	) {
		// This path is permitAll at the security layer, but the JWT filter still populates the
		// principal for authenticated requests. Gate here: require a signed-in caller and enforce
		// ownership. Collapse "not found" and "not yours" into 404 so neither existence nor
		// ownership of someone else's extraction leaks.
		if (userPrincipal == null) return ResponseEntity.status(401).build();
		ProductExtractionRequest request = this.productExtractionService.get(requestId);
		if (request == null || !userPrincipal.getId().equals(request.getUserId())) {
			return ResponseEntity.notFound().build();
		}
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
		// Clamp caller-supplied paging: this endpoint is unauthenticated, so an unbounded size
		// (e.g. ?size=100000000) or a negative page would otherwise be a heap-exhaustion DoS / 500.
		int safePage = Math.max(0, page);
		int safeSize = Math.max(1, Math.min(size, 100));
		Pageable pageable = PageRequest.of(safePage, safeSize, safeSort(sort, direction));
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
