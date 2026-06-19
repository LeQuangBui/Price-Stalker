CREATE TABLE bookmark
(
    id         VARCHAR(255) NOT NULL,
    user_id    VARCHAR(255) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    created_at datetime     NOT NULL,
    updated_at datetime     NOT NULL,
    CONSTRAINT pk_bookmark PRIMARY KEY (id)
);

CREATE TABLE downloaded_image
(
    id         VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    url        VARCHAR(255) NOT NULL,
    created_at datetime     NOT NULL,
    updated_at datetime     NOT NULL,
    CONSTRAINT pk_downloaded_image PRIMARY KEY (id)
);

CREATE TABLE notification_log
(
    id                  VARCHAR(255) NOT NULL,
    alert_id            VARCHAR(255) NULL,
    user_id             VARCHAR(255) NOT NULL,
    product_id          VARCHAR(255) NULL,
    sent_at             datetime     NOT NULL,
    channel             VARCHAR(255) NULL,
    status              VARCHAR(255) NULL,
    provider_message_id VARCHAR(255) NULL,
    message_uuid        VARCHAR(255) NOT NULL,
    CONSTRAINT pk_notificationlog PRIMARY KEY (id)
);

CREATE TABLE price_alert
(
    id              VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    product_id      VARCHAR(255) NOT NULL,
    threshold_price DECIMAL      NOT NULL,
    active          BIT(1)       NOT NULL,
    created_at      datetime     NOT NULL,
    CONSTRAINT pk_price_alert PRIMARY KEY (id)
);

CREATE TABLE price_history
(
    id          VARCHAR(255) NOT NULL,
    product_id  VARCHAR(255) NOT NULL,
    price       DECIMAL      NOT NULL,
    recorded_at datetime     NOT NULL,
    CONSTRAINT pk_pricehistory PRIMARY KEY (id)
);

CREATE TABLE product
(
    id               VARCHAR(255) NOT NULL,
    website_id       VARCHAR(255) NOT NULL,
    name             VARCHAR(255) NOT NULL,
    sku              VARCHAR(255) NULL,
    url              VARCHAR(255) NOT NULL,
    price            DECIMAL NULL,
    original_price   DECIMAL NULL,
    flash_sale_price DECIMAL NULL,
    currency         VARCHAR(255) NULL,
    created_at       datetime     NOT NULL,
    updated_at       datetime     NOT NULL,
    CONSTRAINT pk_product PRIMARY KEY (id)
);

CREATE TABLE product_image
(
    id         VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    url        VARCHAR(255) NOT NULL,
    created_at datetime     NOT NULL,
    updated_at datetime     NOT NULL,
    CONSTRAINT pk_product_image PRIMARY KEY (id)
);

CREATE TABLE product_tag
(
    bookmark_id VARCHAR(255) NOT NULL,
    product_id  VARCHAR(255) NOT NULL
);

CREATE TABLE user
(
    id         VARCHAR(255) NOT NULL,
    username   VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at datetime     NOT NULL,
    updated_at datetime     NOT NULL,
    CONSTRAINT pk_user PRIMARY KEY (id)
);

CREATE TABLE website
(
    id         VARCHAR(255) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    domain     VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NULL,
    phone      VARCHAR(255) NULL,
    created_at datetime     NOT NULL,
    updated_at datetime     NOT NULL,
    CONSTRAINT pk_website PRIMARY KEY (id)
);

ALTER TABLE price_alert
    ADD CONSTRAINT uc_88fcd7fb0ec03ce11fe1b75de UNIQUE (user_id, product_id);

ALTER TABLE downloaded_image
    ADD CONSTRAINT uc_9ddcea187a4ad79a21f51bba0 UNIQUE (product_id, url);

ALTER TABLE product_image
    ADD CONSTRAINT uc_a10fc9bd3530fbd2a45614af8 UNIQUE (product_id, url);

ALTER TABLE product
    ADD CONSTRAINT uc_fab0d22f1575e6cc700fb7515 UNIQUE (url);

ALTER TABLE notification_log
    ADD CONSTRAINT uc_notificationlog_message_uuid UNIQUE (message_uuid);

ALTER TABLE product_image
    ADD CONSTRAINT uc_product_image_url UNIQUE (url);

ALTER TABLE website
    ADD CONSTRAINT uc_website_domain UNIQUE (domain);

ALTER TABLE website
    ADD CONSTRAINT uc_website_email UNIQUE (email);

ALTER TABLE website
    ADD CONSTRAINT uc_website_phone UNIQUE (phone);

ALTER TABLE bookmark
    ADD CONSTRAINT FK_BOOKMARK_ON_USER FOREIGN KEY (user_id) REFERENCES user (id);

ALTER TABLE downloaded_image
    ADD CONSTRAINT FK_DOWNLOADED_IMAGE_ON_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id);

ALTER TABLE notification_log
    ADD CONSTRAINT FK_NOTIFICATIONLOG_ON_PRICE_ALERT FOREIGN KEY (alert_id) REFERENCES price_alert (id);

ALTER TABLE notification_log
    ADD CONSTRAINT FK_NOTIFICATIONLOG_ON_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id);

ALTER TABLE notification_log
    ADD CONSTRAINT FK_NOTIFICATIONLOG_ON_USER FOREIGN KEY (user_id) REFERENCES user (id);

ALTER TABLE price_history
    ADD CONSTRAINT FK_PRICEHISTORY_ON_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id);

ALTER TABLE price_alert
    ADD CONSTRAINT FK_PRICE_ALERT_ON_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id);

ALTER TABLE price_alert
    ADD CONSTRAINT FK_PRICE_ALERT_ON_USER FOREIGN KEY (user_id) REFERENCES user (id);

ALTER TABLE product_image
    ADD CONSTRAINT FK_PRODUCT_IMAGE_ON_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id);

ALTER TABLE product
    ADD CONSTRAINT FK_PRODUCT_ON_WEBSITE FOREIGN KEY (website_id) REFERENCES website (id);

ALTER TABLE product_tag
    ADD CONSTRAINT fk_protag_on_bookmark FOREIGN KEY (bookmark_id) REFERENCES bookmark (id);

ALTER TABLE product_tag
    ADD CONSTRAINT fk_protag_on_product FOREIGN KEY (product_id) REFERENCES product (id);