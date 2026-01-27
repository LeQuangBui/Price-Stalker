package com.pricestalker.bot.scheduling;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.pricestalker.bot.entities.CssSelector;
import com.pricestalker.bot.entities.PriceHistory;
import com.pricestalker.bot.entities.Product;
import com.pricestalker.bot.entities.Website;
import com.pricestalker.bot.repositories.CssSelectorRepository;
import com.pricestalker.bot.repositories.PriceHistoryRepository;
import com.pricestalker.bot.repositories.ProductRepository;
import com.pricestalker.bot.repositories.WebsiteRepository;

@Component
public class PriceMonitor {
	@Autowired
	private ProductRepository productRepository;
	
	@Autowired
	private WebsiteRepository websiteRepository;
	
	@Autowired
	private PriceHistoryRepository priceHistoryRepository;
	
	@Autowired
	private CssSelectorRepository cssSelectorRepository;
	
	@Scheduled(fixedRate = 3, initialDelay = 3, timeUnit = TimeUnit.HOURS)
	public void Monitor() {
		List<Website> websites = (List<Website>) this.websiteRepository.findAll();
		
		
		for (Website website: websites) {
			List<CssSelector> selectors = this.cssSelectorRepository.findByWebsiteAndFieldName(website, "price_label");
			List<Product> products = this.productRepository.findByWebsite(website);
			for (Product product: products) {
				try {
					Document doc = Jsoup.connect(product.getUrl()).get();
					int price = Integer.parseInt(doc.selectFirst(selectors.get(0).getSelectorString()).text().replaceAll("[^0-9]", ""));
					PriceHistory priceHistory = new PriceHistory(product, price);
					product.setCurrentPrice(price);
					this.productRepository.save(product);
					this.priceHistoryRepository.save(priceHistory);
				} catch (IOException e) {
					e.printStackTrace();
				}
				
			}
		}
	}
}
