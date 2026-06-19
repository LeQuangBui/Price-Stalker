package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data @NoArgsConstructor
public class Website {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@OneToMany(mappedBy = "website")
	private List<Product> products;
	
	@Column(name = "NAME", nullable = false)
	private String name;
	
	@Column(name = "DOMAIN", nullable = false, unique = true)
	private String domain;
	
	@Column(name = "EMAIL", nullable = true, unique = true)
	private String email;
	
	@Column(name = "PHONE", nullable = true, unique = true)
	private String phone;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
}
