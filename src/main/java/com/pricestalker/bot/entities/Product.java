package com.pricestalker.bot.entities;


import java.time.LocalDateTime;
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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

@Entity
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
	private List<ProductImage> productImages;
	
	@ManyToMany
	@JoinTable(
		name = "product_tag",
		joinColumns = @JoinColumn(name = "PRODUCT_ID", nullable = false),
		inverseJoinColumns = @JoinColumn(name = "BOOKMARK_ID", nullable = false))
	private List<Bookmark> bookmarks;
	
	@Column(name = "NAME", nullable = false)
	private String name;
	
	@Column(name = "URL", nullable = false)
	private String url;
	
	@Column(name = "CURRENT_PRICE", nullable = false)
	private int currentPrice;
	private String currency;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
	
	public String getId() {
		return id;
	}
	public void setId(String id) {
		this.id = id;
	}	
	public Website getWebsite() {
		return website;
	}	
	public void setWebsiteId(Website website) {
		this.website = website;
	}
	public List<PriceHistory> getPriceHistories() {
		return this.priceHistories;
	}
	public void setPricesHistories(List<PriceHistory> priceHistories) {
		this.priceHistories = priceHistories;
	}
	public List<ProductImage> getProductImages() {
		return this.productImages;
	}
	public void setProductImages(List<ProductImage> productImages) {
		this.productImages = productImages;
	}
	public List<Bookmark> getBookmarks() {
		return this.bookmarks;
	}
	public void setBookmarks(List<Bookmark> bookmarks) {
		this.bookmarks = bookmarks;
	}
	public String getName() {
		return name;
	}	
	public void setName(String name) {
		this.name = name;
	}	
	public String getUrl() {
		return url;
	}	
	public void setUrl(String url) {
		this.url = url;
	}	
	public int getCurrentPrice() {
		return currentPrice;
	}	
	public void setCurrentPrice(int currentPrice) {
		this.currentPrice = currentPrice;
	}
	public String getCurrency() {
		return currency;
	}
	public void setCurrency(String currency) {
		this.currency = currency;
	}
	public LocalDateTime getCreatedAt() {
		return createdAt;
	}
	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
