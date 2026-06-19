package com.pricestalker.api.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuthTokenService {
    private final SecureRandom secureRandom = new SecureRandom();

    public String generateEmailVerificationCode() {
        return String.format("%06d", this.secureRandom.nextInt(1_000_000));
    }

    public String generatePasswordResetToken() {
        return UUID.randomUUID().toString();
    }

    public String hash(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Token value is required");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch(NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 hashing is unavailable", ex);
        }
    }

    public boolean matches(String rawValue, String expectedHash) {
        if (rawValue == null || rawValue.isBlank() || expectedHash == null || expectedHash.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                hash(rawValue).getBytes(StandardCharsets.UTF_8),
                expectedHash.getBytes(StandardCharsets.UTF_8)
        );
    }
}
