package com.pricestalker.demo.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import com.pricestalker.demo.dtos.BookmarkRequestDto;
import com.pricestalker.demo.entities.Bookmark;
import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.repositories.BookmarkRepository;
import com.pricestalker.demo.repositories.ProductRepository;
import com.pricestalker.demo.repositories.UserRepository;

@Service
public class BookmarkService {
	@Autowired
	private BookmarkRepository bookmarkRepository;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private ProductRepository productRepository;
	
	public Bookmark addBookmark(String username, BookmarkRequestDto bookmarkRequestDto) {
		Bookmark bookmark = new Bookmark();
		bookmark.setName(bookmarkRequestDto.getName());
		bookmark.setUser(this.userRepository.findByUsername(username));
		List<Product> products = new ArrayList<Product>();
		for (String id: bookmarkRequestDto.getProductIds()) {
			Product p = this.productRepository.findById(id).orElse(null);
			if (p != null) products.add(p);
		}
		bookmark.setBookmarkedProducts(products);
		return this.bookmarkRepository.save(bookmark);
	}
	
	public Bookmark getBookmark(String id) {
		return this.bookmarkRepository.findById(id).orElse(null);
	}
	
	public Page<Bookmark> getBookmarksByUsername(String username, Pageable pageable) {
		return this.bookmarkRepository.findByUsername(username, pageable);
	}
	
	public Bookmark addProduct(String id, String productId) {
		Bookmark bookmark = this.bookmarkRepository.findById(id).orElse(null);
		Product product = this.productRepository.findById(productId).orElse(null);
		if (bookmark == null || product == null) return null;
		bookmark.getBookmarkedProducts().add(product);
		return this.bookmarkRepository.save(bookmark);
	}
	
	public Bookmark removeProduct(String id, String productId) {
		Bookmark bookmark = this.bookmarkRepository.findById(id).orElse(null);
		Product product = this.productRepository.findById(productId).orElse(null);
		if (bookmark == null || product == null) return null;
		bookmark.getBookmarkedProducts().remove(product);
		return this.bookmarkRepository.save(bookmark);
	}
	
	public Bookmark updateBookmark(String id, BookmarkRequestDto bookmarkRequestDto) {
		Bookmark bookmark = this.bookmarkRepository.findById(id).orElse(null);
		if (bookmark == null) return null;
		bookmark.setName(bookmarkRequestDto.getName());
		List<Product> products = new ArrayList<Product>();
		for (String productId: bookmarkRequestDto.getProductIds()) {
			Product product = this.productRepository.findById(productId).orElse(null);
			if (product == null) continue;
			products.add(product);
		}
		bookmark.setBookmarkedProducts(products);
		return this.bookmarkRepository.save(bookmark);
	}
	
	public void deleteBookmark(String is) {
		this.productRepository.deleteById(is);
	}
}
