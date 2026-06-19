package com.pricestalker.core.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pricestalker.core.entity.DownloadedImage;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.ProductImage;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
public class ProductExtract {
    private String url;
    private String name;
    private String sku;

    @JsonProperty("original_price")
    private BigDecimal originalPrice;

    private BigDecimal price;

    @JsonProperty("flash_sale")
    private BigDecimal flashSalePrice;

    private String currency;
    private String domain;

    @JsonProperty("image_urls")
    private List<String> imageUrls = new ArrayList<>();

    private List<String> images = new ArrayList<>();

    public Product transform() {
        Product product = new Product();
        product.setUrl(this.url);
        product.setName(this.name);
        product.setSku(this.sku);
        product.setOriginalPrice(this.originalPrice);
        product.setPrice(this.price);
        product.setFlashSalePrice(this.flashSalePrice);
        product.setCurrency(this.currency);

        List<ProductImage> productImages = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String imgUrl : this.imageUrls) {
            if (seen.add(imgUrl)) {
                ProductImage img = new ProductImage();
                img.setUrl(imgUrl);
                img.setProduct(product);
                productImages.add(img);
            }
        }
        product.setProductImages(productImages);

        List<DownloadedImage> downloadedImages = new ArrayList<>();
        seen = new LinkedHashSet<>();
        for (String imgUrl : this.images) {
            if (seen.add(imgUrl)) {
                DownloadedImage img = new DownloadedImage();
                img.setUrl(imgUrl);
                img.setProduct(product);
                downloadedImages.add(img);
            }
        }
        product.setDownloadedImages(downloadedImages);

        return product;
    }
}

