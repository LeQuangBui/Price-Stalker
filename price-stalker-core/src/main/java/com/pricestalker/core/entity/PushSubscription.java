package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A browser Web Push subscription (the output of PushManager.subscribe). One row per
 * device/browser per user.
 *
 * MySQL can't UNIQUE-index a full TEXT column, and push endpoint URLs are long, so the
 * endpoint is stored as TEXT and uniqueness / lookup is on endpoint_hash = sha256hex(endpoint).
 */
@Entity
@Table(name = "push_subscription")
@Data
@NoArgsConstructor
public class PushSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @Column(name = "ENDPOINT", columnDefinition = "TEXT", nullable = false)
    private String endpoint;

    /** sha256hex(endpoint) — the indexable unique key (full endpoint TEXT is not indexable). */
    @Column(name = "ENDPOINT_HASH", length = 64, nullable = false, unique = true)
    private String endpointHash;

    /** Subscriber public key (base64url) from the browser subscription. */
    @Column(name = "P256DH", nullable = false)
    private String p256dh;

    /** Subscriber auth secret (base64url) from the browser subscription. */
    @Column(name = "AUTH", nullable = false)
    private String auth;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "LAST_SUCCESS_AT")
    private LocalDateTime lastSuccessAt;
}
