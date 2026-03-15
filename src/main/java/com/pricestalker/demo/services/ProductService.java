package com.pricestalker.demo.services;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.pricestalker.demo.dtos.ProductRequestDto;
import com.pricestalker.demo.entities.CssSelector;
import com.pricestalker.demo.entities.Product;
import com.pricestalker.demo.entities.ProductImage;
import com.pricestalker.demo.entities.Website;
import com.pricestalker.demo.repositories.ProductImageRepository;
import com.pricestalker.demo.repositories.ProductRepository;
import com.pricestalker.demo.repositories.WebsiteRepository;

@Service
public class ProductService {
  @Value("${chrome.driver.path}")
  private String chromeDriverPath;
	
	@Autowired
    private ProductImageRepository productImageRepository;
	
	@Autowired
	private ProductRepository productRepository;
	
	@Autowired
	private WebsiteRepository websiteRepository;
	
	public Product addProduct(Product product) {
		return this.productRepository.save(product);
	}
	
	public Product addProduct(ProductRequestDto productRequestDto) throws IOException {
		String url = productRequestDto.getUrl();
		if (this.productRepository.existsByUrl(url)) return null;
		Website w = this.websiteRepository.findOneByUrl(url);
		if (w == null) return null;

		Map<String, String> map = new HashMap<String, String>();
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
	
	public Product getProduct(String id) {
		return this.productRepository.findById(id).orElse(null);
	}
	
	public Page<Product> getAllProducts(Pageable pageable) {
		return this.productRepository.findAll(pageable);
	}
	
	public Page<Product> searchProduct(Optional<String> search, Pageable pageable) {
		return this.productRepository.findBySearchText(search, pageable);
	}

	public Page<Product> searchProductByUrl(Optional<String> url, Pageable pageable) {
		return this.productRepository.findByUrl(url, pageable);
	}
	
	public Page<Product> searchProductByWebsite(Optional<String> website, Pageable pageable) {
		return this.productRepository.findByWebsite(website, pageable);
	}
	
	public Product updateProduct(Product product) {
		return this.productRepository.save(product);
	}
	
	public void deleteProduct(String id) {
		this.productRepository.deleteById(id);
	}
}
