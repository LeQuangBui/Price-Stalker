-- Token revocation support: bump this counter to invalidate all previously issued JWTs for a user
-- (e.g. on password reset). Each JWT embeds the issuing version as the 'ver' claim; the auth filter
-- rejects any token whose 'ver' != the user's current token_version.
ALTER TABLE user
    ADD COLUMN token_version INT NOT NULL DEFAULT 0;
