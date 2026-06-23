package com.pricestalker.core.repository;

import com.pricestalker.core.entity.NotificationLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, String> {
    NotificationLog findByMessageUuid(String messageUuid);

    /**
     * The authed user's DELIVERED notification rows (newest first), product fetched, for the in-app
     * bell. Caller dedups by event_id (one drop = an EMAIL + a PUSH row). Only SENT rows are returned
     * so a FAILED or stuck-SENDING push attempt never shows in the bell as if it were delivered.
     * Test pushes never log, so they never appear here.
     */
    @Query("select n from NotificationLog n left join fetch n.product "
            + "where n.user.id = :userId and n.eventId is not null "
            + "and n.status = com.pricestalker.core.entity.NotificationLog.Status.SENT "
            + "order by n.sentAt desc")
    List<NotificationLog> findRecentByUser(@Param("userId") String userId, Pageable pageable);
}
