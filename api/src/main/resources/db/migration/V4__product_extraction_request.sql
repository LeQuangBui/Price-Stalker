CREATE TABLE product_extraction_request
(
    id            VARCHAR(36) NOT NULL,
    url           VARCHAR(2048) NOT NULL,
    status        ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL,
    product_id    VARCHAR(255) NULL,
    error_message TEXT NULL,
    created_at    datetime NOT NULL,
    updated_at    datetime NOT NULL,
    completed_at  datetime NULL,
    CONSTRAINT pk_product_extraction_request PRIMARY KEY (id)
);

CREATE INDEX idx_product_extraction_request_status
    ON product_extraction_request (status);

ALTER TABLE product_extraction_request
    ADD CONSTRAINT FK_PRODUCT_EXTRACTION_REQUEST_ON_PRODUCT
        FOREIGN KEY (product_id) REFERENCES product (id);
