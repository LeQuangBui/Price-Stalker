package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.User;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>{
    Optional<User> findByUsername(String username);
}
