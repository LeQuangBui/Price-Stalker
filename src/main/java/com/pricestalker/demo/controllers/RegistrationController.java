package com.pricestalker.demo.controllers;

import com.pricestalker.demo.entities.User;
import com.pricestalker.demo.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class RegistrationController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationController(UserRepository userRepository,
                                  PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

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


        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));

        userRepository.save(user);

        // redirect to login page
        return "redirect:/auth/login";
    }
}
