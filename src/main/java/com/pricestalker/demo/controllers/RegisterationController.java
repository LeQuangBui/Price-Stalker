package com.pricestalker.demo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.pricestalker.demo.repositories.UserRepository;
import com.pricestalker.demo.entities.User;
import java.util.UUID;


@RestController
public class RegisterationController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping(value = "/register", consumes = "application/json")
    public User  createUser(@RequestBody User newUser) {
        newUser.setId(UUID.randomUUID().toString());
        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
        return userRepository.save(newUser);
    }
    
}
