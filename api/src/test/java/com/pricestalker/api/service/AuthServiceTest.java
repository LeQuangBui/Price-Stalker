package com.pricestalker.api.service;

import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.api.dto.auth.*;
import com.pricestalker.api.exception.auth.EmailNotVerifiedException;
import com.pricestalker.api.exception.auth.InvalidPasswordResetTokenException;
import com.pricestalker.api.messaging.AlertEmailPublisher;
import com.pricestalker.api.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Mock
    private AlertEmailPublisher alertEmailPublisher;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthTokenService authTokenService;

    @InjectMocks
    private AuthService authService;

    @Test
    void signupStoreUnverifiedUserAndQueuesVerificationEmail() {
        SignupRequestDto request = new SignupRequestDto();
        request.setUsername("hungbeodamde");
        request.setEmail("hungbeo@example.com");
        request.setPassword("hungbeosecret");

        when(userRepository.existsByUsername("hungbeodamde")).thenReturn(false);
        when(userRepository.existsByEmail("hungbeo@example.com")).thenReturn(false);
        when(passwordEncoder.encode("hungbeosecret")).thenReturn("password-hash");
        when(authTokenService.generateEmailVerificationCode()).thenReturn("123456");
        when(authTokenService.hash("123456")).thenReturn("code-hash");

        SignupResponseDto response = authService.signup(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();

        assertThat(saved.getUsername()).isEqualTo("hungbeodamde");
        assertThat(saved.getEmail()).isEqualTo("hungbeo@example.com");
        assertThat(saved.getPassword()).isEqualTo("password-hash");
        assertThat(saved.isEmailVerified()).isFalse();
        assertThat(saved.getEmailVerificationCodeHash()).isEqualTo("code-hash");
        assertThat(saved.getEmailVerificationCodeExpiresAt()).isAfter(LocalDateTime.now());
        assertThat(response.getMessage()).isEqualTo("Verification code sent");
        verify(alertEmailPublisher).publishEmailVerification(saved, "123456");
        verify(alertEmailPublisher, never()).publishWelcome(any(User.class));
    }

    @Test
    void loginRejectsUnverifiedEmailAfterValidCredentials() {
        LoginRequestDto request = new LoginRequestDto();
        request.setUsername("hungbeodamde");
        request.setPassword("hungbeosecret");

        User user = user("hungbeodamde", "hungbeo@example.com", false);
        when(userRepository.findByUsername("hungbeodamde")).thenReturn(user);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(EmailNotVerifiedException.class)
                .hasMessage("Email verification is required before login");

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtil, never()).generateToken("hungbeodamde");
    }

    @Test
    void requestPasswordResetStoresHashAndQueuesEmailForVerifiedUser() {
        PasswordResetRequestDto request = new PasswordResetRequestDto();
        request.setEmail("hungbeo@example.com");

        User user = user("hungbeodamde", "hungbeo@example.com", true);
        when(userRepository.findByEmail("hungbeo@example.com")).thenReturn(user);
        when(authTokenService.generatePasswordResetToken()).thenReturn("reset-token");
        when(authTokenService.hash("reset-token")).thenReturn("reset-hash");

        authService.requestPasswordReset(request);

        assertThat(user.getPasswordResetTokenHash()).isEqualTo("reset-hash");
        assertThat(user.getPasswordResetTokenExpiresAt()).isAfter(LocalDateTime.now());
        verify(userRepository).save(user);
        verify(alertEmailPublisher).publishPasswordReset(user, "reset-token");
    }

    @Test
    void confirmPasswordResetChangesPasswordAndClearsToken() {
        PasswordResetConfirmRequestDto request = new PasswordResetConfirmRequestDto();
        request.setToken("reset-token");
        request.setNewPassword("new-secret");

        User user = user("hungbeodamde", "hungbeo@example.com", true);
        user.setPasswordResetTokenHash("reset-hash");
        user.setPasswordResetTokenExpiresAt(LocalDateTime.now().plusMinutes(10));

        when(authTokenService.hash("reset-token")).thenReturn("reset-hash");
        when(userRepository.findByPasswordResetTokenHash("reset-hash")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("new-secret")).thenReturn("new-password-hash");

        authService.confirmPasswordReset(request);

        assertThat(user.getPassword()).isEqualTo("new-password-hash");
        assertThat(user.getPasswordResetTokenHash()).isNull();
        assertThat(user.getPasswordResetTokenExpiresAt()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void confirmPasswordResetRejectsExpiredToken() {
        PasswordResetConfirmRequestDto request = new PasswordResetConfirmRequestDto();
        request.setToken("reset-token");
        request.setNewPassword("new-secret");

        User user = user("hungbeodamde", "hungbeo@example.com", true);
        user.setPasswordResetTokenHash("reset-hash");
        user.setPasswordResetTokenExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(authTokenService.hash("reset-token")).thenReturn("reset-hash");
        when(userRepository.findByPasswordResetTokenHash("reset-hash")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.confirmPasswordReset(request))
                .isInstanceOf(InvalidPasswordResetTokenException.class)
                .hasMessage("Password reset token is invalid or expired");
    }

    private User user(String username, String email, boolean verified) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword("existing-hash");
        user.setEmailVerified(verified);
        return user;
    }
}
