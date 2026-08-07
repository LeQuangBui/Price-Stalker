package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Data @NoArgsConstructor
@Table(name = "PRODUCT_IMAGE", uniqueConstraints = {
		@UniqueConstraint(columnNames = {"PRODUCT_ID", "URL"})
})
public class ProductImage {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="PRODUCT_ID", nullable = false)
	private Product product;
	
	@Column(name = "URL", nullable = false, unique = true)
	private String url;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
}
