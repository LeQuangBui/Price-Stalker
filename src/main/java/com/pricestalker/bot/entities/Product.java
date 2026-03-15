package com.pricestalker.bot.entities;


import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter @NoArgsConstructor
public class Product {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "WEBSITE_ID", nullable = false)
	private Website website;
	
	@OneToMany(mappedBy = "product")
	private List<PriceHistory> priceHistories;
	
	@OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
	private List<ProductImage> productImages = new ArrayList<>();
	
	@ManyToMany(mappedBy = "bookmarkedProducts")
	private List<Bookmark> bookmarks;
	
	@Column(name = "NAME", nullable = false)
	private String name;
	
	@Column(name = "URL", nullable = false)
	private String url;
	
	@Column(name = "CURRENT_PRICE", nullable = false)
	private int currentPrice;
	
	@Column(name = "CURRENCY", nullable = false)
	private String currency;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
}
