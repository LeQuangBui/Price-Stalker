package com.pricestalker.api.service;

import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.api.dto.auth.PasswordResetRequestDto;
import com.pricestalker.api.messaging.AlertEmailPublisher;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.pricestalker.api.dto.auth.SignupRequestDto;

import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(
        UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }
    
    public User getUser(String id) {
        return this.userRepository.findById(id).orElse(null);
    }
    
    public Page<User> getAllUsers(Pageable pageable) {
        return this.userRepository.findAll(pageable);
    }
    
    public Page<User> getUsersByUsername(String username, Pageable pageable) {
        return this.userRepository.findByUsernameContainingIgnoreCase(username, pageable);
    }
}
