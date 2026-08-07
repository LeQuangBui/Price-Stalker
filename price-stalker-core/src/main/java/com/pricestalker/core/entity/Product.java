package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data @NoArgsConstructor
public class Product {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "WEBSITE_ID", nullable = false)
	private Website website;
	
	@OneToMany(mappedBy = "product")
	private List<PriceHistory> priceHistories;

	@OneToMany(mappedBy = "product")
	private List<PriceAlert> priceAlerts;

	@OneToMany(mappedBy = "product")
	private List<NotificationLog> notificationLogs;
	
	@OneToMany(mappedBy = "product", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
	private List<ProductImage> productImages = new ArrayList<>();

	@OneToMany(mappedBy = "product", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
	private List<DownloadedImage> downloadedImages = new ArrayList<>();
	
	@ManyToMany(mappedBy = "bookmarkedProducts")
	private List<Bookmark> bookmarks;
	
	@Column(name = "NAME", nullable = false)
	private String name;

	@Column(name = "SKU")
	private String sku;
	
	@Column(name = "URL", nullable = false, unique = true)
	private String url;
	
	@Column(name = "PRICE")
	private BigDecimal price;

	@Column(name = "ORIGINAL_PRICE")
	private BigDecimal originalPrice;

	@Column(name = "FLASH_SALE_PRICE")
	private BigDecimal flashSalePrice;
	
	@Column(name = "CURRENCY")
	private String currency;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
}
