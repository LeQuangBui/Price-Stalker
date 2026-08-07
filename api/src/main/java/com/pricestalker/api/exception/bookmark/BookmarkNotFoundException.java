package com.pricestalker.api.exception.bookmark;

public class BookmarkNotFoundException extends RuntimeException {
    public BookmarkNotFoundException(String id) {
        super("Bookmark not found: " + id);
    }
}
