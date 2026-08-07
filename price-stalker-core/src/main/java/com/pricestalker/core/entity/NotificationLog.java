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

    /**
     * The originating PriceDroppedEvent id (the "drop" id). Set by BOTH the email and push
     * listeners so the in-app notification bell can group the EMAIL + PUSH rows of one drop
     * into a single entry (GET /notifications dedups by event_id). Nullable for legacy rows.
     */
    @Column(name = "EVENT_ID")
    private String eventId;

    public enum Channel {EMAIL, SMS, PUSH}
    // SENDING is the outbox "claim" state: committed before the provider send so a retry can
    // dedup against an in-flight/just-sent message (exactly-once-ish). Stored as STRING, so
    // adding it needs no DB migration (status is a VARCHAR column).
    public enum Status {SENDING, SENT, FAILED, BOUNCED, COMPLAINED}
}
