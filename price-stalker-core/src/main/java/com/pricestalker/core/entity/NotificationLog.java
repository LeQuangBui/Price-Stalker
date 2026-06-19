package com.pricestalker.core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data @NoArgsConstructor
public class NotificationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ALERT_ID")
    private PriceAlert alert;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PRODUCT_ID")
    private Product product;

    @Column(name = "SENT_AT", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "CHANNEL")
    @Enumerated(EnumType.STRING)
    private Channel channel;

    @Column(name = "STATUS")
    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "PROVIDER_MESSAGE_ID")
    private String providerMessageId;

    @Column(name = "MESSAGE_UUID", nullable = false, unique = true)
    private String messageUuid;

    public enum Channel {EMAIL, SMS, PUSH}
    public enum Status {SENT, FAILED, BOUNCED, COMPLAINED}
}
