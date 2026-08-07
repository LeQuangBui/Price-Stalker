package com.pricestalker.api.controller;

import com.pricestalker.core.entity.NotificationLog;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.NotificationLogRepository;
import com.pricestalker.core.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class NotificationControllerTest {
    @Mock private NotificationLogRepository logs;
    @Mock private UserRepository users;
    @Mock private Authentication auth;

    private NotificationController controller;

    @BeforeEach
    void setUp() {
        controller = new NotificationController(logs, users);
        User u = new User("hung", "hung@example.com", "hashed");
        u.setId("u1");
        when(auth.getName()).thenReturn("hung");
        when(users.findByUsername("hung")).thenReturn(u);
    }

    private NotificationLog row(String eventId, Product p, LocalDateTime at) {
        NotificationLog n = new NotificationLog();
        n.setEventId(eventId);
        n.setProduct(p);
        n.setSentAt(at);
        return n;
    }

    @Test
    void collapsesEmailAndPushRowsOfOneDropIntoOneEntry() {
        Product p = new Product();
        p.setId("p1");
        p.setName("GTX 4070");
        p.setUrl("https://hacom.vn/p1");
        LocalDateTime now = LocalDateTime.now();

        // drop e1 produced an email row + a push row; e2 is an older drop
        when(logs.findRecentByUser(eq("u1"), any())).thenReturn(List.of(
                row("e1", p, now),
                row("e1", p, now),
                row("e2", p, now.minusHours(1))
        ));

        var resp = controller.list(auth, 20);

        assertThat(resp.getBody()).hasSize(2);
        assertThat(resp.getBody().get(0).getEventId()).isEqualTo("e1");
        assertThat(resp.getBody().get(0).getProductName()).isEqualTo("GTX 4070");
        assertThat(resp.getBody().get(1).getEventId()).isEqualTo("e2");
    }
}
