package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data @NoArgsConstructor
@Table(name = "PRICE_ALERT", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"USER_ID", "PRODUCT_ID"})
})
public class PriceAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PRODUCT_ID", nullable = false)
    private Product product;

    @Column(name = "THRESHOLD_PRICE", nullable = false)
    private BigDecimal thresholdPrice;

    @Column(name = "ACTIVE", nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;
}
