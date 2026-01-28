package com.pricestalker.demo.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;


@Controller
public class PageController {
    @GetMapping("/bookmarks")
    public String bookmarks() {
        return "bookmarks";
    }

    @GetMapping("/bookmark-create")
    public String bookmarkCreate() {
        return "bookmark-create";
    }

    @GetMapping("/home")
    public String home() {
        return "home";
    }
}