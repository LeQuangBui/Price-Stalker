package com.pricestalker.core.repository;

import com.pricestalker.core.entity.DownloadedImage;
import com.pricestalker.core.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DownloadedImageRepository extends JpaRepository<DownloadedImage, String> {
    boolean existsByProductAndUrl(Product product, String url);
}
