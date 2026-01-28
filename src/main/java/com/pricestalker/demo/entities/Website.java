package com.pricestalker.demo.entities;

import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter @NoArgsConstructor
public class Website {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@OneToMany(mappedBy = "website")
	private List<Product> products;
	
	@OneToMany(mappedBy = "website")
	private List<CssSelector> cssSelectors;
	
	@Column(name = "NAME", nullable = false)
	private String name;
	
	@Column(name = "URL", nullable = false)
	private String url;
	
	@Column(name = "EMAIL", nullable = true)
	private String email;
	
	@Column(name = "PHONE", nullable = true)
	private String phone;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
}
