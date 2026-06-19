package com.pricestalker.api.service;

import com.pricestalker.core.entity.Product;
import com.pricestalker.core.repository.PriceHistoryRepository;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class PriceHistoryServiceTest {
    private final PriceHistoryRepository priceHistoryRepository = mock(PriceHistoryRepository.class);
    private final PriceHistoryService priceHistoryService = new PriceHistoryService(priceHistoryRepository);

    @Test
    void addPriceHistorySkipsProductWithoutAnyPrice() {
        Product product = new Product();

        priceHistoryService.addPriceHistory(product);

        verify(priceHistoryRepository, never()).save(any());
    }
}
