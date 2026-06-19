package com.pricestalker.core.repository;

import com.pricestalker.core.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, String> {
    NotificationLog findByMessageUuid(String messageUuid);
}
