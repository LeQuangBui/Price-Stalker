package com.pricestalker.demo.controllers;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.pricestalker.demo.services.ChatService;
import org.springframework.web.bind.annotation.CrossOrigin;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class ChatController {
	private final ChatService chatService;
		
		public ChatController(ChatService chatService) {
			this.chatService = chatService;
		}
		
		
		
		@PostMapping("/chat")
		public Map<String, String> chat(@RequestParam Map<String, String> body) {
			String message = body.get("message");
			
			if (message == null || message.trim().isEmpty()) {
	            return Map.of("reply", "Please enter a message.");
	        }
			String reply = chatService.chat(message);
			return Map.of("reply", reply);
		}
;}
