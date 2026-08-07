package com.pricestalker.api.controller;

import com.pricestalker.api.dto.notification.NotificationResponseDto;
import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * Read-only in-app notification bell. Reads the authed user's notification_log rows and
 * collapses them to ONE entry per drop (event_id) — a drop produces both an EMAIL and a PUSH
 * row. Test pushes never hit notification_log, so they never appear here (H8/G5).
 */
@RestController
@RequestMapping("/notifications")
public class NotificationController {
    private final NotificationLogRepository logs;
    private final UserRepository users;

    public NotificationController(NotificationLogRepository logs, UserRepository users) {
        this.logs = logs;
        this.users = users;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponseDto>> list(
            Authentication auth,
            @RequestParam(defaultValue = "20") int size
    ) {
        User user = this.users.findByUsername(auth.getName());
        if (user == null) return ResponseEntity.status(401).build();

        // Clamp caller-supplied size to a sane window: size=0 / negative / huge would make
        // PageRequest.of throw (500) or over-fetch (size*3 could even overflow negative).
        int limit = Math.max(1, Math.min(size, 50));
        // Over-fetch (×3) since each drop yields up to ~2 rows (email + push), then dedup by event_id.
        List<NotificationLog> rows = this.logs.findRecentByUser(user.getId(), PageRequest.of(0, limit * 3));
        LinkedHashMap<String, NotificationResponseDto> byEvent = new LinkedHashMap<>();
        for (NotificationLog n : rows) {
            if (byEvent.containsKey(n.getEventId())) continue;
            Product p = n.getProduct();
            byEvent.put(n.getEventId(), new NotificationResponseDto(
                    n.getEventId(),
                    p != null ? p.getId() : null,
                    p != null ? p.getName() : null,
                    p != null ? p.getUrl() : null,
                    n.getSentAt()
            ));
            if (byEvent.size() >= limit) break;
        }
        return ResponseEntity.ok(new ArrayList<>(byEvent.values()));
    }
}
