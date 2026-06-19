ALTER TABLE user
    ADD COLUMN email_verified BIT(1) NOT NULL DEFAULT 0,
    ADD COLUMN email_verification_code_hash VARCHAR(64) NULL,
    ADD COLUMN email_verification_code_expires_at datetime NULL,
    ADD COLUMN password_reset_token_hash VARCHAR(64) NULL,
    ADD COLUMN password_reset_token_expires_at datetime NULL;

ALTER TABLE user
    ADD CONSTRAINT uc_user_email UNIQUE (email);

CREATE INDEX idx_user_password_reset_token_hash
    ON user (password_reset_token_hash);