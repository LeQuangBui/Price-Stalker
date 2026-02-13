package com.pricestalker.demo.controllers;


import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pricestalker.demo.services.SuggestionService;

import org.springframework.web.bind.annotation.RequestBody;

@RestController
public class SuggestionController {
	
	private SuggestionService service;
	
	public SuggestionController(SuggestionService service) {
		this.service = service;
	}
	@PostMapping(value="/api/suggestions",consumes="text/plain",produces="text/plain")
	public String suggest(@RequestBody String req) {
		return service.suggest(req);
	}
}
