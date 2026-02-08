package com.pricestalker.demo.controllers;

import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.GetMapping;


@Controller
public class PageController {

    
    @GetMapping("/bookmarks")
    public String bookmarks() {
        return "Bookmark/bookmarks";
    }

    @GetMapping("/bookmark-create")
    public String bookmarkCreate() {
        return "Bookmark/bookmark-create";
    }

    

    @GetMapping("/products")
    public String products() {
        return "ManyProducts/products";
    }

    @GetMapping("/product")
    public String product() {
        return "EachProduct/product";
    }
    
    
}