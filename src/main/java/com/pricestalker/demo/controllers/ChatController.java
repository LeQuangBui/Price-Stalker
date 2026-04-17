package com.pricestalker.demo.controllers;
import java.util.Map; 
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.pricestalker.demo.services.ChatService;



@RestController
public class ChatController {
	private final ChatService chatService;
		
		public ChatController(ChatService chatService) {
			this.chatService = chatService;
		}
		
		
		
		@PostMapping("/chat")
		public Map<String, String> chat(@RequestBody Map<String, String> body) {
			String message = body.get("message");
			
			if (message == null || message.trim().isEmpty()) {
	            return Map.of("reply", "Please enter a message.");
	        }
			String reply = chatService.chat(message);
			return Map.of("reply", reply);
		}
;}
