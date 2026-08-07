package com.pricestalker.core.repository;


import com.pricestalker.core.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>{
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);
    User findByUsername(String username);
    User findByEmail(String email);
    Optional<User> findByPasswordResetTokenHash(String passwordResetTokenHash);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // Row-locked read for the email-verification flow: serializes concurrent verify attempts so the
    // wrong-guess counter (AuthService) can't be raced past its cap. Must run inside a transaction.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmailForUpdate(@Param("email") String email);
}
