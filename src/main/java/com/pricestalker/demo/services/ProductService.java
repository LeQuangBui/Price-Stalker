package com.pricestalker.demo.services;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.pricestalker.demo.entities.CssSelector;
import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.Website;
import com.pricestalker.demo.repositories.ProductRepository;
import com.pricestalker.demo.repositories.WebsiteRepository;

@Component
public class ProductService {
	@Autowired
	private ProductRepository productRepository;
	
	@Autowired WebsiteRepository websiteRepository;
	
	public void addProduct(Product p) {
		this.productRepository.save(p);
	}
	
	public void addProduct(String url) throws IOException {
		Website w = this.websiteRepository.findOneByUrl(url);
		if (w == null) return;

		Map<String, String> map = new HashMap<String, String>();
        Document doc = Jsoup.connect(url).get();
        
        for (CssSelector s: w.getCssSelectors()) {
        	Element e = doc.selectFirst(s.getSelectorString());
        	map.put(s.getFieldName(), e.text().trim());
        }
        
		Product p = new Product();
		p.setName(map.get("name"));
		p.setWebsite(w);
		p.setUrl(url);
		p.setCurrentPrice(Integer.parseInt(map.get("price_label").replaceAll("[^0-9]", "")));
		p.setCurrency(map.get("price_label").replaceAll("[0-9., ]", ""));
		
		this.productRepository.save(p);
	}
	
	public List<Product> getAllProducts() {
		List<Product> products = (List<Product>) this.productRepository.findAll();
		return products;
	}
	
	public Product getProduct(String id) {
		Optional<Product> optional = this.productRepository.findById(id);
		Product product = optional.get();
		return product;
	}
	
	public List<Product> getProductBySearchText(String searchText) {
		return this.productRepository.findBySearchText(searchText);
	}
	
	public void updateProduct(Product p, String id) {
		p.setId(id);
		Optional<Product> optional = this.productRepository.findById(id);
		Product product = optional.get();
		
		if (product.getId() == id) {
			this.productRepository.save(p);
		}
	}
	
	public void deleteProduct(String id) {
		this.productRepository.deleteById(id);
	}
}
