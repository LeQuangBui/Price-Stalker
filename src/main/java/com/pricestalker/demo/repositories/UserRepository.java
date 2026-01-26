package com.pricestalker.demo.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.demo.entities.User;

public interface UserRepository extends JpaRepository<User, String>{

}
