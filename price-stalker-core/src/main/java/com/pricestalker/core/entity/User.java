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
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@OneToMany(mappedBy = "user")
	private List<Bookmark> bookmarks;

	@OneToMany(mappedBy = "user")
	private List<PriceAlert> PriceAlert;

	@OneToMany(mappedBy = "user")
	private List<NotificationLog> notificationLogs;
	
	@Column(name = "USERNAME", nullable = false)
	private String username;
	
	@Column(name = "EMAIL", nullable = false)
	private String email;
	
	@Column(name = "PASSWORD", nullable = false)
	private String password;

	@Column(name = "EMAIL_VERIFIED", nullable = false)
	private boolean emailVerified;

	@Column(name  = "EMAIL_VERIFICATION_CODE_HASH")
	private String emailVerificationCodeHash;

	@Column(name = "EMAIL_VERIFICATION_CODE_EXPIRES_AT")
	private LocalDateTime emailVerificationCodeExpiresAt;

	@Column(name = "PASSWORD_RESET_TOKEN_HASH")
	private String passwordResetTokenHash;

	@Column(name = "PASSWORD_RESET_TOKEN_EXPIRES_AT")
	private LocalDateTime passwordResetTokenExpiresAt;
	
	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
	
	public User(String username, String email, String password) {
		this.username = username;
		this.email = email;
		this.password = password;
	}
}
