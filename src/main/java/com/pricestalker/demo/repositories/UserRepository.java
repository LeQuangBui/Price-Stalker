package com.pricestalker.demo.repositories;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.User;

public interface UserRepository extends JpaRepository<User, String> {

    Page<User> findByUsername(Optional<String> username, Pageable pageable);

    User findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}