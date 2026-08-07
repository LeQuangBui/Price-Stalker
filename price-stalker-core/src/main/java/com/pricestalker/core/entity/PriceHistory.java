package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data @NoArgsConstructor
public class PriceHistory {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "PRODUCT_ID", nullable = false)
	private Product product;
	
	@Column(name = "PRICE", nullable = false)
	private BigDecimal price;
	
	@CreationTimestamp
	@Column(name = "RECORDED_AT", nullable = false)
	private LocalDateTime recordedAt;
	
	public PriceHistory(Product product, BigDecimal price) {
		this.product = product;
		this.price = price;
	}
}