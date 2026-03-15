package com.pricestalker.demo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pricestalker.demo.dtos.BookmarkRequestDto;
import com.pricestalker.demo.dtos.BookmarkResponseDto;
import com.pricestalker.demo.entities.Bookmark;
import com.pricestalker.demo.services.BookmarkService;

@RestController
public class BookmarkController {
	@Autowired
	private BookmarkService bookmarkService;
	
	@GetMapping("/bookmarks/me")
	public ResponseEntity<Page<BookmarkResponseDto>> getUserBookmarks(
			Authentication authentication,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "DESC") String direction
	) {
		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sort));
		String username = authentication.getName();
		Page<Bookmark> bookmarks = this.bookmarkService.getBookmarksByUsername(username, pageable);
		Page<BookmarkResponseDto> dtoPage = bookmarks.map(BookmarkResponseDto::from);
		return ResponseEntity.ok(dtoPage);
	}
	
	@GetMapping("bookmarks/{id}")
	public ResponseEntity<BookmarkResponseDto> getBookmark(@PathVariable String id) {
		Bookmark bookmark = this.bookmarkService.getBookmark(id);
		return ResponseEntity.ok(BookmarkResponseDto.from(bookmark));
	}
	
	@PostMapping("/bookmarks")
	public ResponseEntity<BookmarkResponseDto> createBookmark(@RequestBody BookmarkRequestDto request, Authentication authentication) {
		String username = authentication.getName();
		Bookmark bookmark = this.bookmarkService.addBookmark(username, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(BookmarkResponseDto.from(bookmark));
	}
	
	
	  @PostMapping("/bookmarks/{bookmarkId}/products/{productId}")
	  public ResponseEntity<BookmarkResponseDto> addProduct(
	      @PathVariable String bookmarkId,
	      @PathVariable String productId
	  ) {
	      Bookmark bookmark = bookmarkService.addProduct(bookmarkId, productId);
	      return ResponseEntity.ok(BookmarkResponseDto.from(bookmark));
	  }

	  @DeleteMapping("/bookmarks/{bookmarkId}/products/{productId}")
	  public ResponseEntity<Void> removeProduct(
	      @PathVariable String bookmarkId,
	      @PathVariable String productId
	  ) {
	      bookmarkService.removeProduct(bookmarkId, productId);
	      return ResponseEntity.noContent().build();
	  }
	
	@DeleteMapping("/bookmarks/{id}")
	public ResponseEntity<Void> deleteBookmark(@PathVariable String id) {
		this.bookmarkService.deleteBookmark(id);
		return ResponseEntity.noContent().build();
	}
}
