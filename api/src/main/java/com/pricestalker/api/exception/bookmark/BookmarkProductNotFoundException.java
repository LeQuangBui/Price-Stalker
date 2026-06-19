package com.pricestalker.api.exception.bookmark;

public class BookmarkProductNotFoundException extends RuntimeException {
    public BookmarkProductNotFoundException(String productId) {
        super("Product not found for bookmark: " + productId);
    }
}
