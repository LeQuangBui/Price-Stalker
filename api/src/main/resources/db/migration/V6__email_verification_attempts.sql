-- Cap email-verification brute force: track wrong-guess attempts per user so the 6-digit code can
-- be invalidated after a few failures (see AuthService.MAX_VERIFICATION_ATTEMPTS) instead of letting
-- the full 10^6 space be enumerated within the code's 15-minute TTL.
ALTER TABLE user
    ADD COLUMN email_verification_attempts INT NOT NULL DEFAULT 0;
