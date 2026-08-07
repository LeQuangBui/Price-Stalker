package com.pricestalker.core.event;

import java.time.Instant;

/**
 * Published by the api when a user clicks "send test notification". Routed with
 * RoutingKeys.PUSH_TEST to the push.test queue; the email-service test listener sends a
 * canned push to {@code userId}'s subscriptions WITHOUT touching notification_log
 * (no claim, no dedup, no product lookup).
 */
public record PushTestEvent(String userId, Instant requestedAt) {
}
