package com.pricestalker.demo.services;

import org.springframework.stereotype.Service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.pricestalker.demo.repositories.UserRepository;
import com.pricestalker.demo.dtos.SignupRequestDto;
import com.pricestalker.demo.entities.User;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private BCryptPasswordEncoder bCryptPasswordEncoder;

    public User addUser(SignupRequestDto request) {
    		User user = new User();
    		user.setUsername(request.getUsername());
    		user.setEmail(request.getEmail());
    		user.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
    		return this.userRepository.save(user);
    }
    
    public Boolean existsByUsername(String username) {
    		return this.userRepository.existsByUsername(username);
    }
    
	public User getUserByUsername(String username) {
		return this.userRepository.findByUsername(username);
	}
    
    public User getUser(String id) {
    		return this.userRepository.findById(id).orElse(null);
    }
    
    public Page<User> getAllUsers(Pageable pageable) {
    		return this.userRepository.findAll(pageable);
    }
    
    public Page<User> getUsersByUsername(Optional<String> username, Pageable pageable) {
    		return this.userRepository.findByUsername(username, pageable);
    }
    
    public User updateUser(User user) {
    		return this.userRepository.save(user);
    }
    
    public void deleteUser(String id) {
    		this.userRepository.deleteById(id);
    }
}
