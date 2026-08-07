package com.pricestalker.api.service;

import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.api.dto.auth.*;
import com.pricestalker.api.exception.auth.*;
import com.pricestalker.api.messaging.AlertEmailPublisher;
import com.pricestalker.api.util.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {
    private static final long EMAIL_VERIFICATION_TTL_MINUTES = 15;
    private static final long PASSWORD_RESET_TTL_MINUTES = 30;
    // Wrong-guess cap per issued code: after this many failures the code is burned (force a resend),
    // bounding brute force to MAX_VERIFICATION_ATTEMPTS guesses out of 10^6 per code instead of the
    // whole space within the 15-minute TTL.
    private static final int MAX_VERIFICATION_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final AlertEmailPublisher alertEmailPublisher;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final AuthTokenService authTokenService;

    public AuthService(
        UserRepository userRepository,
        BCryptPasswordEncoder bCryptPasswordEncoder,
        AlertEmailPublisher alertEmailPublisher,
        AuthenticationManager authenticationManager,
        JwtUtil jwtUtil,
        AuthTokenService authTokenService
    ) {
        this.userRepository = userRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
        this.alertEmailPublisher = alertEmailPublisher;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.authTokenService = authTokenService;
    }

    public AuthResponseDto login(LoginRequestDto dto) {
        String username = requireText(dto == null ? null : dto.getUsername(), "Username");
        String password = requireText(dto == null ? null : dto.getPassword(), "Password");

        try {
            this.authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
            );
        } catch (AuthenticationException ex) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        User user = this.userRepository.findByUsername(username);
        if (user == null) {
            throw new InvalidCredentialsException("Invalid credentials");
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Email verification is required before login");
        }

        String token = this.jwtUtil.generateToken(username, user.getTokenVersion());
        return new AuthResponseDto(token, username);
    }

    public SignupResponseDto signup(SignupRequestDto dto) {
        String username = requireText(dto == null ? null : dto.getUsername(), "Username");
        String email = normalizeEmail(requireText(dto == null ? null : dto.getEmail(), "Email"));
        String password = requireText(dto == null ? null : dto.getPassword(), "Password");

        if (this.userRepository.existsByUsername(username)) {
            throw new UsernameAlreadyExistsException("Username already exists");
        }
        if (this.userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(this.bCryptPasswordEncoder.encode(password));
        user.setEmailVerified(false);
        String code = issueEmailVerificationCode(user);

        this.userRepository.save(user);
        this.alertEmailPublisher.publishEmailVerification(user, code);

        return new SignupResponseDto(username, email, "Verification code sent");
    }

    // noRollbackFor: a wrong guess throws InvalidEmailVerificationCodeException, but the preceding
    // save() that increments the attempt counter MUST still commit — otherwise the @Transactional
    // rollback reverts the increment, the code is never burned, and the brute-force cap is inert.
    @Transactional(noRollbackFor = InvalidEmailVerificationCodeException.class)
    public AuthResponseDto verifyEmail(EmailVerificationRequestDto dto) {
        String email = normalizeEmail(requireText(dto == null ? null : dto.getEmail(), "Email"));
        String code = requireText(dto == null ? null : dto.getCode(), "Verification code");

        // Pessimistic lock: serialize concurrent verify attempts for this account so the wrong-guess
        // counter increments atomically and the cap can't be raced (parallel guesses can't all read 0).
        User user = this.userRepository.findByEmailForUpdate(email).orElse(null);
        if (user == null) {
            throw new InvalidEmailVerificationCodeException("Verification code is invalid or expired");
        }
        if (user.isEmailVerified()) {
            // Already verified: do NOT mint a token here. This endpoint takes only email + code (no
            // password) and is public, so returning a JWT for a verified account would be account
            // takeover by email address alone. The user must sign in instead. Same generic error as a
            // bad code, so it doesn't leak which emails are registered/verified.
            throw new InvalidEmailVerificationCodeException("Verification code is invalid or expired");
        }

        boolean expired = user.getEmailVerificationCodeExpiresAt() == null
            || user.getEmailVerificationCodeExpiresAt().isBefore(LocalDateTime.now());
        boolean matches = !expired
            && this.authTokenService.matches(code, user.getEmailVerificationCodeHash());

        if (!matches) {
            // Count the wrong guess; once the cap is hit, burn the code so the rest of the 10^6 space
            // can't be enumerated. A new code must be requested (resend), which only reaches the
            // account owner's inbox — an attacker gains nothing by forcing a reissue.
            int attempts = user.getEmailVerificationAttempts() + 1;
            user.setEmailVerificationAttempts(attempts);
            if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
                user.setEmailVerificationCodeHash(null);
                user.setEmailVerificationCodeExpiresAt(null);
            }
            this.userRepository.save(user);
            throw new InvalidEmailVerificationCodeException("Verification code is invalid or expired");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationCodeHash(null);
        user.setEmailVerificationCodeExpiresAt(null);
        user.setEmailVerificationAttempts(0);
        this.userRepository.save(user);
        try {
            this.alertEmailPublisher.publishWelcome(user);
        } catch (RuntimeException brokerUnavailable) {
            // Best-effort welcome email: a broker hiccup must NOT roll back the (now successful) email
            // verification. The account is verified and the user gets a token regardless.
        }

        return new AuthResponseDto(this.jwtUtil.generateToken(user.getUsername(), user.getTokenVersion()), user.getUsername());
    }

    public void resendEmailVerification(EmailVerificationResendRequestDto dto) {
        String email = normalizeEmail(requireText(dto == null ? null : dto.getEmail(), "Email"));
        User user = this.userRepository.findByEmail(email);
        if (user == null || user.isEmailVerified()) {
            return;
        }

        String code = issueEmailVerificationCode(user);
        this.userRepository.save(user);
        this.alertEmailPublisher.publishEmailVerification(user, code);
    }

    public void requestPasswordReset(PasswordResetRequestDto dto) {
        String email = normalizeEmail(requireText(dto == null ? null : dto.getEmail(), "Email"));
        User user = this.userRepository.findByEmail(email);
        if (user == null || !user.isEmailVerified()) {
            return;
        }

        String token = this.authTokenService.generatePasswordResetToken();
        user.setPasswordResetTokenHash(this.authTokenService.hash(token));
        user.setPasswordResetTokenExpiresAt(LocalDateTime.now().plusMinutes(PASSWORD_RESET_TTL_MINUTES));
        this.userRepository.save(user);
        this.alertEmailPublisher.publishPasswordReset(user, token);
    }


    public void confirmPasswordReset(PasswordResetConfirmRequestDto dto) {
        String token = requireText(dto == null ? null : dto.getToken(), "Reset token");
        String newPassword = requireText(dto == null ? null : dto.getNewPassword(), "New password");
        String tokenHash = this.authTokenService.hash(token);

        User user = this.userRepository.findByPasswordResetTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidPasswordResetTokenException("Password reset token is invalid or expired"));

        if (user.getPasswordResetTokenExpiresAt() == null || user.getPasswordResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidPasswordResetTokenException("Password reset token is invalid or expired");
        }

        user.setPassword(this.bCryptPasswordEncoder.encode(newPassword));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetTokenExpiresAt(null);
        // Revoke every JWT issued before this reset: bumping the version makes the auth filter's
        // 'ver' check fail for all previously minted tokens (a leaked/active session can't survive
        // a password reset).
        user.setTokenVersion(user.getTokenVersion() + 1);
        this.userRepository.save(user);
    }

    private String issueEmailVerificationCode(User user) {
        String code = this.authTokenService.generateEmailVerificationCode();
        user.setEmailVerificationCodeHash(this.authTokenService.hash(code));
        user.setEmailVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(EMAIL_VERIFICATION_TTL_MINUTES));
        user.setEmailVerificationAttempts(0);
        return code;
    }

    private String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value.trim();
    }

    private String normalizeEmail(String email) {
        return email.toLowerCase(Locale.ROOT);
    }
}
