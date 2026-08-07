package com.pricestalker.api.exception.bookmark;

public class BookmarkUserNotFoundException extends RuntimeException {
    public BookmarkUserNotFoundException(String userId) {
        super("User not found for bookmark: " + userId);
    }
}
