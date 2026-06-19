package com.pricestalker.api.controller;

import com.pricestalker.api.dto.auth.*;
import com.pricestalker.api.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@RequestBody LoginRequestDto dto) {
        return ResponseEntity.ok(this.authService.login(dto));
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponseDto> signup(@RequestBody SignupRequestDto dto) {
        return ResponseEntity.ok(this.authService.signup(dto));
    }

    @PostMapping("/email-verification/verify")
    public ResponseEntity<AuthResponseDto> verifyEmail(@RequestBody EmailVerificationRequestDto dto) {
        return ResponseEntity.ok(this.authService.verifyEmail(dto));
    }

    @PostMapping("/email-verification/resend")
    public ResponseEntity<Void> resendEmailVerification(@RequestBody EmailVerificationResendRequestDto dto) {
        this.authService.resendEmailVerification(dto);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<Void> requestPasswordReset(@RequestBody PasswordResetRequestDto dto) {
        this.authService.requestPasswordReset(dto);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(@RequestBody PasswordResetConfirmRequestDto dto) {
        this.authService.confirmPasswordReset(dto);
        return ResponseEntity.noContent().build();
    }
}
