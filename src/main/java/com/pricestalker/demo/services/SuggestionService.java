package com.pricestalker.demo.services;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class SuggestionService {
	private ChatClient chatClient;
	
	public SuggestionService(ChatClient.Builder builder) {
		chatClient = builder.build();
	}
	
	public String suggest(String productName) {
		String prompt = """
			    You are a deal-finding assistant.

			    Goal:
			    Given a specific product, list alternative WEBSITES/RETAILERS that sell the SAME product for potentially cheaper.

			    Rules:
			    - Do NOT suggest different/alternative products.
			    - Keep the product the same (same model/version).
			    - Return 5 sites maximum.
			    - For each site, provide:
			      siteName, searchUrl (or productUrl if known), and a short reason (e.g., discounts, marketplace, coupons, refurbished).

			    Input product:
			    %s

			    Output format (one per line):
			    - <siteName> | <searchOrProductUrl> | <reason>
			    """.formatted(productName);
		return chatClient.prompt()
				.user(prompt)
				.call()
				.content();
	}
}
