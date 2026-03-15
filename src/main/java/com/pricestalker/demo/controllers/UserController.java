package com.pricestalker.demo.controllers;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pricestalker.demo.dtos.UserResponseDto;
import com.pricestalker.demo.entities.User;
import com.pricestalker.demo.services.UserService;

@RestController
public class UserController {
	@Autowired
	private UserService userService;
	
	@GetMapping("/users/me")
	public ResponseEntity<UserResponseDto> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        User user = this.userService.getUserByUsername(username);
        return ResponseEntity.ok(UserResponseDto.from(user));
    }
	
	@GetMapping("/users/{id}")
	public ResponseEntity<UserResponseDto> getUser(@PathVariable String id) {
		User user = this.userService.getUser(id);
		return ResponseEntity.ok(UserResponseDto.from(user));
	}
	
	@GetMapping("/users")
	public ResponseEntity<Page<UserResponseDto>> getUsers(
			@RequestParam Optional<String> username,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "DESC") String direction
	) {
		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sort));
		Page<User> users;
		if (username.isPresent()) {
			users = userService.getUsersByUsername(username, pageable);
		} else {
			users = userService.getAllUsers(pageable);
		}
		
		Page<UserResponseDto> dtoPage = users.map(UserResponseDto::from);
		return ResponseEntity.ok(dtoPage);
	}

}
