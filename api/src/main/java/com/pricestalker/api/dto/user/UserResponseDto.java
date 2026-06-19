package com.pricestalker.api.dto.user;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.pricestalker.core.entity.Bookmark;
import com.pricestalker.core.entity.User;
import com.pricestalker.api.dto.bookmark.BookmarkResponseDto;
import lombok.Data;

@Data
public class UserResponseDto {
	private String id;
	private List<BookmarkResponseDto> bookmarks;
	private String username;
	private String email;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	
	public UserResponseDto() {
		this.bookmarks = new ArrayList<BookmarkResponseDto>();
	}

	public static UserResponseDto from(User user) {
		if (user == null) return null;
		UserResponseDto dto = new UserResponseDto();
		dto.id = user.getId();
		for (Bookmark bookmark: user.getBookmarks()) {
			dto.bookmarks.add(BookmarkResponseDto.from(bookmark));
		}
		dto.username = user.getUsername();
		dto.email = user.getEmail();
		dto.createdAt = user.getCreatedAt();
		dto.updatedAt = user.getUpdatedAt();
		return dto;
	}
}
