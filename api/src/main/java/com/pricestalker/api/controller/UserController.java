package com.pricestalker.api.controller;

import com.pricestalker.core.entity.User;
import com.pricestalker.api.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.pricestalker.api.dto.user.UserResponseDto;
import com.pricestalker.api.service.UserService;

@RestController
@RequestMapping("/users")
public class UserController {
	private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
	public ResponseEntity<UserResponseDto> getCurrentUser(
		@AuthenticationPrincipal UserPrincipal userPrincipal
	) {
        String id = userPrincipal.getId();
        User user = this.userService.getUser(id);
        return ResponseEntity.ok(UserResponseDto.from(user));
    }
	
	@GetMapping("/{id}")
	public ResponseEntity<UserResponseDto> getUser(@PathVariable String id) {
		User user = this.userService.getUser(id);
		return ResponseEntity.ok(UserResponseDto.from(user));
	}
	
	@GetMapping()
	public ResponseEntity<Page<UserResponseDto>> getUsers(
			@RequestParam(defaultValue = "") String username,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "DESC") String direction
	) {
		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sort));
		Page<User> users;
		if (!username.isEmpty()) {
			users = userService.getUsersByUsername(username, pageable);
		} else {
			users = userService.getAllUsers(pageable);
		}
		return ResponseEntity.ok(users.map(UserResponseDto::from));
	}

}
