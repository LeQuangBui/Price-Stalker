CREATE TABLE push_subscription
(
    id              VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    endpoint        TEXT         NOT NULL,
    endpoint_hash   CHAR(64)     NOT NULL,
    p256dh          VARCHAR(255) NOT NULL,
    auth            VARCHAR(255) NOT NULL,
    created_at      datetime     NOT NULL,
    last_success_at datetime     NULL,
    CONSTRAINT pk_push_subscription PRIMARY KEY (id)
);

ALTER TABLE push_subscription
    ADD CONSTRAINT uc_push_subscription_endpoint_hash UNIQUE (endpoint_hash);

ALTER TABLE push_subscription
    ADD CONSTRAINT FK_PUSH_SUBSCRIPTION_ON_USER FOREIGN KEY (user_id) REFERENCES user (id);

CREATE INDEX idx_push_subscription_user ON push_subscription (user_id);

-- H2: the in-app notification bell groups notification_log rows per drop (one entry per
-- PriceDroppedEvent, even though a drop produces both an EMAIL and a PUSH row).
ALTER TABLE notification_log
    ADD COLUMN event_id VARCHAR(255) NULL;

CREATE INDEX idx_notification_log_event ON notification_log (event_id);
