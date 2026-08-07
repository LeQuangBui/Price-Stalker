package com.pricestalker.api.service;

import java.util.ArrayList;
import java.util.List;

import com.pricestalker.core.entity.Bookmark;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.BookmarkRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.api.exception.bookmark.BookmarkNotFoundException;
import com.pricestalker.api.exception.bookmark.BookmarkProductNotFoundException;
import com.pricestalker.api.exception.bookmark.BookmarkUserNotFoundException;
import com.pricestalker.api.exception.bookmark.InvalidBookmarkException;
import com.pricestalker.api.exception.priceAlert.PriceAlertNotFoundException;
import com.pricestalker.api.exception.priceAlert.PriceAlertUserNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import com.pricestalker.api.dto.bookmark.BookmarkRequestDto;

@Service
public class BookmarkService {
	private final BookmarkRepository bookmarkRepository;
	private final UserRepository userRepository;
	private final ProductRepository productRepository;

	public BookmarkService(
		BookmarkRepository bookmarkRepository,
		UserRepository userRepository,
		ProductRepository productRepository
	) {
		this.bookmarkRepository = bookmarkRepository;
		this.userRepository = userRepository;
		this.productRepository = productRepository;
	}
	
	public Bookmark addBookmark(String userId, BookmarkRequestDto dto) {
		String name = dto.getName();
		if (name == null) throw new InvalidBookmarkException("invalid bookmark");
		User user = this.userRepository.findById(userId).orElse(null);
		if (user == null) throw new BookmarkUserNotFoundException(userId);
		Bookmark bookmark = new Bookmark();
		bookmark.setName(dto.getName());
		bookmark.setUser(user);
		List<Product> products = new ArrayList<Product>();
		for (String id: dto.getProductIds()) {
            Product p = this.productRepository.findById(id).orElse(null);
			if (p == null) throw new BookmarkProductNotFoundException(id);
			products.add(p);
        }
		bookmark.setBookmarkedProducts(products);
		return this.bookmarkRepository.save(bookmark);
	}

	public Bookmark getBookmark(String userId, String id) {
		Bookmark bookmark = this.bookmarkRepository.findById(id).orElse(null);
		// Scope to the owner: a non-owner gets the same NotFound as a missing id (no existence leak,
		// no cross-user read). Mirrors modifyBookmark's ownership check used by update/delete.
		if (bookmark == null || !bookmark.getUser().getId().equals(userId)) {
			throw new BookmarkNotFoundException(id);
		}
		return bookmark;
	}
	
	public Bookmark modifyBookmark(String userId, String id) {
		Bookmark bookmark = this.bookmarkRepository.findById(id).orElse(null);
		if (bookmark == null || !bookmark.getUser().getId().equals(userId)) {
			throw new BookmarkNotFoundException(id);
		}
		return bookmark;
	}
	
	public Page<Bookmark> getAllByUser(String userId, Pageable pageable) {
		User user = this.userRepository.findById(userId).orElse(null);
		if (user == null) throw new BookmarkUserNotFoundException(userId);
		return this.bookmarkRepository.findByUserId(userId, pageable);
	}
	
	public Bookmark updateBookmark(
		String id,
		String userId,
		BookmarkRequestDto dto
	) {
		Bookmark bookmark = modifyBookmark(userId, id);
		if (dto.getName() != null) bookmark.setName(dto.getName());
		List<Product> products = new ArrayList<Product>();
		for (String productId: dto.getProductIds()) {
			Product p = this.productRepository.findById(productId).orElse(null);
			if (p == null) throw new BookmarkProductNotFoundException(id);
			products.add(p);
		}
		bookmark.setBookmarkedProducts(products);
		return this.bookmarkRepository.save(bookmark);
	}
	
	public void deleteBookmark(String userId, String id) {
		modifyBookmark(userId, id);
		this.bookmarkRepository.deleteById(id);
	}
}
