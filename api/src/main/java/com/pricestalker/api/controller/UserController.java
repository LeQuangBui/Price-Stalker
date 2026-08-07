package com.pricestalker.api.controller;

import com.pricestalker.core.entity.User;
import com.pricestalker.api.security.UserPrincipal;
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

    // Only the caller's own profile is exposed. The former GET /users (list all) and GET /users/{id}
    // returned email + bookmarks for ANY user to ANY authenticated caller — an email-harvest / IDOR.
    // The SPA only ever calls /users/me; reintroduce listing behind an admin role if ever needed.
    @GetMapping("/me")
	public ResponseEntity<UserResponseDto> getCurrentUser(
		@AuthenticationPrincipal UserPrincipal userPrincipal
	) {
        String id = userPrincipal.getId();
        User user = this.userService.getUser(id);
        return ResponseEntity.ok(UserResponseDto.from(user));
    }
}
