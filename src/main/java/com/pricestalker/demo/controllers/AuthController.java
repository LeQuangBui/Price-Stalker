package com.pricestalker.demo.controllers;

import com.pricestalker.demo.entities.User;
import com.pricestalker.demo.repositories.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AuthController {
	@Autowired
    private UserRepository userRepository;
	
	@Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/auth/signup")
    public String registerUser(
            @RequestParam String username,
            @RequestParam String email,
            @RequestParam String password
    ) {
       
        if (userRepository.existsByUsername(username)) {
            return "redirect:/auth/signup?error=user_exists";
        }

        if (userRepository.existsByEmail(email)) {
            return "redirect:/auth/signup?error=user_exists";
        }

        User user = new User(username, email, passwordEncoder.encode(password));
        userRepository.save(user);

        // redirect to login page
        return "redirect:/auth/login";
    }
    
    @GetMapping("/auth/signup")
    public String signup() {
        return "Auth/signup";
    }
    
    @GetMapping("/auth/login")
    public String login() {
        return "Auth/login";
    }
    
}
