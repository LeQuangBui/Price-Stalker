package com.pricestalker.demo.services;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.pricestalker.demo.entities.CssSelector;
import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.ProductImage;
import com.pricestalker.demo.entities.Website;
import com.pricestalker.demo.repositories.ProductImageRepository;
import com.pricestalker.demo.repositories.ProductRepository;
import com.pricestalker.demo.repositories.WebsiteRepository;

@Component
public class ProductService {
	@Autowired
    private ProductImageRepository productImageRepository;
	
	@Autowired
	private ProductRepository productRepository;
	
	@Autowired
	private WebsiteRepository websiteRepository;
	
	public void addProduct(Product p) {
		this.productRepository.save(p);
	}
	
	public Product addProduct(String url) throws IOException {
		Website w = this.websiteRepository.findOneByUrl(url);
		if (w == null) return null;

		Map<String, String> map = new HashMap<String, String>();
		String chromeDriverPath = "C:\\Users\\quang\\Downloads\\chromedriver-win64";
		System.setProperty("webdrive.chrome.driver", chromeDriverPath);
		ChromeOptions options = new ChromeOptions();
		options.addArguments("--headless", "--disable-gpu", "--window-size=1920,1200", "ignore-certificate-errors");
		ChromeDriver driver = new ChromeDriver(options);
		driver.get(url);
        
        for (CssSelector s: w.getCssSelectors()) {
        	WebElement e = driver.findElement(By.cssSelector(s.getSelectorString()));
        	String data = null;
        	if (s.getFieldName().equals("image")) data = e.getAttribute("src");
        	else data = e.getText().trim();  	
        	map.put(s.getFieldName(), data);
        }
        
		Product p = new Product();
		p.setName(map.get("name"));
		p.setWebsite(w);
		p.setUrl(url);
		p.setCurrentPrice(Integer.parseInt(map.get("price_label").replaceAll("[^0-9]", "")));
		p.setCurrency(map.get("price_label").replaceAll("[0-9., ]", ""));
		
		ProductImage img = new ProductImage();
		img.setProduct(p);
		img.setUrl(map.get("image"));
		
		this.productRepository.save(p);
		this.productImageRepository.save(img);
		
		return p;
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

	public Product getProductByUrl(String url) {
		return this.productRepository.findOneByUrl(url);
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
