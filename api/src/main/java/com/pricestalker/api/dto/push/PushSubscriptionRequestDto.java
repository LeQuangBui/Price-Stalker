package com.pricestalker.api.dto.push;

import lombok.Data;

/** Mirrors the browser PushSubscription JSON: { endpoint, keys: { p256dh, auth } }. */
@Data
public class PushSubscriptionRequestDto {
    private String endpoint;
    private Keys keys;

    @Data
    public static class Keys {
        private String p256dh;
        private String auth;
    }
}
