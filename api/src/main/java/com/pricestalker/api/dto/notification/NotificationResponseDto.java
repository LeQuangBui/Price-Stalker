package com.pricestalker.api.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/** One in-app notification (one per price drop) for the bell. */
@Data
@AllArgsConstructor
public class NotificationResponseDto {
    private String eventId;
    private String productId;
    private String productName;
    private String productUrl;
    private LocalDateTime sentAt;
}
