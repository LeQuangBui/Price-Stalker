package com.pricestalker.demo.services;

import java.util.UUID; 

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

@Service
public class ChatService {
	private final ChatClient chatClient;
	private final String conversationId;
	
	public ChatService(ChatModel chatModel, ChatMemory chatMemory) {
		this.chatClient = ChatClient.builder(chatModel)
				.defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
				.build();
		this.conversationId = UUID.randomUUID().toString();
	}
	
	public String chat(String prompt) {
		if (prompt == null || prompt.trim().isEmpty()) {
	        return "Please enter a message.";
	    }
		return chatClient.prompt()
				.user(userMessage -> userMessage.text(prompt))
				.advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
				.call()
				.content();
	}
}
