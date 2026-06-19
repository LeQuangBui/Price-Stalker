package com.pricestalker.core.repository;


import com.pricestalker.core.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>{
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);
    User findByUsername(String username);
    User findByEmail(String email);
    Optional<User> findByPasswordResetTokenHash(String passwordResetTokenHash);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
