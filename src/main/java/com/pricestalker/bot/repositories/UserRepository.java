package com.pricestalker.bot.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.pricestalker.bot.entities.User;

public interface UserRepository extends JpaRepository<User, String>{

}
