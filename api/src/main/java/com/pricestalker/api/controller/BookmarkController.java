package com.pricestalker.api.controller;

import com.pricestalker.core.entity.Bookmark;
import com.pricestalker.api.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

import jakarta.validation.Valid;

import com.pricestalker.api.dto.bookmark.BookmarkRequestDto;
import com.pricestalker.api.dto.bookmark.BookmarkResponseDto;
import com.pricestalker.api.service.BookmarkService;

@RestController
@RequestMapping("/bookmarks")
@Validated
public class BookmarkController {
	private final BookmarkService bookmarkService;

	/** Allowlist of caller-supplied sort fields (real Bookmark entity fields only). */
	private static final Set<String> SORTABLE_FIELDS = Set.of(
		"createdAt", "updatedAt", "name"
	);
	private static final String DEFAULT_SORT_FIELD = "createdAt";

	private static Sort safeSort(String field, String direction) {
		String safeField = (field != null && SORTABLE_FIELDS.contains(field)) ? field : DEFAULT_SORT_FIELD;
		Sort.Direction safeDirection = "ASC".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
		return Sort.by(safeDirection, safeField);
	}

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @GetMapping()
	public ResponseEntity<Page<BookmarkResponseDto>> getBookmarksByUser(
			@AuthenticationPrincipal UserPrincipal userPrincipal,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "DESC") String direction
	) {
		int safePage = Math.max(0, page);
		int safeSize = Math.max(1, Math.min(size, 100));
		Pageable pageable = PageRequest.of(safePage, safeSize, safeSort(sort, direction));
		String userId = userPrincipal.getId();
		Page<Bookmark> bookmarks = this.bookmarkService.getAllByUser(userId, pageable);
		return ResponseEntity.ok(bookmarks.map(BookmarkResponseDto::from));
	}
	
	@GetMapping("/{id}")
	public ResponseEntity<BookmarkResponseDto> getBookmark(
		@PathVariable("id") String id,
		@AuthenticationPrincipal UserPrincipal userPrincipal
	) {
		Bookmark bookmark = this.bookmarkService.getBookmark(userPrincipal.getId(), id);
		return ResponseEntity.ok(BookmarkResponseDto.from(bookmark));
	}
	
	@PostMapping()
	public ResponseEntity<BookmarkResponseDto> createBookmark(
		@AuthenticationPrincipal UserPrincipal userPrincipal,
		@Valid @RequestBody BookmarkRequestDto request
	) {
		String userId = userPrincipal.getId();
		Bookmark bookmark = this.bookmarkService.addBookmark(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(BookmarkResponseDto.from(bookmark));
	}
	
	@PutMapping("/{id}")
	public ResponseEntity<BookmarkResponseDto> updateProducts(
		@PathVariable("id") String id,
		@AuthenticationPrincipal UserPrincipal userPrincipal,
		@Valid @RequestBody BookmarkRequestDto dto
	) {
		String userId = userPrincipal.getId();
		Bookmark updated = this.bookmarkService.updateBookmark(id, userId, dto);
		return ResponseEntity.ok(BookmarkResponseDto.from(updated));
	}
	
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> deleteBookmark(
		@PathVariable("id") String id,
		@AuthenticationPrincipal UserPrincipal userPrincipal
	) {
		String userId = userPrincipal.getId();
		this.bookmarkService.deleteBookmark(userId, id);
		return ResponseEntity.noContent().build();
	}
}
