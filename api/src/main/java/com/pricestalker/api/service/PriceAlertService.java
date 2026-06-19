package com.pricestalker.api.service;

import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.Product;
import com.pricestalker.core.entity.User;
import com.pricestalker.core.repository.PriceAlertRepository;
import com.pricestalker.core.repository.ProductRepository;
import com.pricestalker.core.repository.UserRepository;
import com.pricestalker.api.dto.priceAlert.PriceAlertRequestDto;
import com.pricestalker.api.dto.priceAlert.PriceAlertUpdateRequestDto;
import com.pricestalker.api.exception.priceAlert.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PriceAlertService {
    private final PriceAlertRepository priceAlertRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public PriceAlertService(
        PriceAlertRepository priceAlertRepository,
        UserRepository userRepository,
        ProductRepository productRepository
    ) {
        this.priceAlertRepository = priceAlertRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    public Page<PriceAlert> getAllByUser(String userId, Pageable pageable) {
        User user = this.userRepository.findById(userId).orElse(null);
        if (user == null) throw new PriceAlertUserNotFoundException(userId);
        return this.priceAlertRepository.findAllByUserId(userId, pageable);
    }

    public PriceAlert getPriceAlert(String userId, String id) {
        PriceAlert priceAlert = this.priceAlertRepository.findById(id).orElse(null);
        if (priceAlert == null || !priceAlert.getUser().getId().equals(userId)) {
            throw new PriceAlertNotFoundException(id);
        }
        return priceAlert;
    }

    public PriceAlert addPriceAlert(String userId, PriceAlertRequestDto dto) {
        User user = this.userRepository.findById(userId).orElse(null);
        if (user == null) throw new PriceAlertUserNotFoundException(userId);
        Product product = this.productRepository.findById(dto.getProductId()).orElse(null);
        if (product == null) throw new PriceAlertProductNotFoundException(dto.getProductId());
        PriceAlert exist = this.priceAlertRepository.findByUserIdAndProductId(userId, dto.getProductId());
        if (exist != null) throw new DuplicatePriceAlertException(userId, product.getId());
        PriceAlert priceAlert = new PriceAlert();
        priceAlert.setUser(user);
        priceAlert.setProduct(product);
        priceAlert.setThresholdPrice(dto.getThresholdPrice());
        return this.priceAlertRepository.save(priceAlert);
    }

    public PriceAlert updatePriceAlert(
        String priceAlertId,
        String userId,
        PriceAlertUpdateRequestDto dto
    ) {
        PriceAlert priceAlert = getPriceAlert(userId, priceAlertId);
        if (dto.getProductId() != null) {
            Product product = this.productRepository.findById(dto.getProductId()).orElse(null);
            if (product == null) throw new PriceAlertProductNotFoundException(dto.getProductId());;
            priceAlert.setProduct(product);
        }
        if (dto.getThresholdPrice() != null) {
            BigDecimal threshold = dto.getThresholdPrice();
            if (threshold.compareTo(BigDecimal.ZERO) < 0) throw new InvalidPriceAlertThresholdException(threshold);
            priceAlert.setThresholdPrice(threshold);
        }
        if (dto.getActive() != null) {
            priceAlert.setActive(dto.getActive());
        }
        return this.priceAlertRepository.save(priceAlert);
    }

    public void deletePriceAlert(String userId, String id) {
        getPriceAlert(userId, id);
        this.priceAlertRepository.deleteById(id);
    }
}
