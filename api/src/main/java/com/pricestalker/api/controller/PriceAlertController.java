package com.pricestalker.api.controller;

import com.pricestalker.core.entity.Bookmark;
import com.pricestalker.core.entity.PriceAlert;
import com.pricestalker.core.entity.User;
import com.pricestalker.api.dto.bookmark.BookmarkResponseDto;
import com.pricestalker.api.dto.priceAlert.PriceAlertRequestDto;
import com.pricestalker.api.dto.priceAlert.PriceAlertResponseDto;
import com.pricestalker.api.dto.priceAlert.PriceAlertUpdateRequestDto;
import com.pricestalker.api.security.UserPrincipal;
import com.pricestalker.api.service.PriceAlertService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/alerts")
@Validated
public class PriceAlertController {
    private final PriceAlertService priceAlertService;

    /** Allowlist of caller-supplied sort fields (real PriceAlert entity fields only). */
    private static final Set<String> SORTABLE_FIELDS = Set.of(
        "createdAt", "thresholdPrice", "active"
    );
    private static final String DEFAULT_SORT_FIELD = "createdAt";

    private static Sort safeSort(String field, String direction) {
        String safeField = (field != null && SORTABLE_FIELDS.contains(field)) ? field : DEFAULT_SORT_FIELD;
        Sort.Direction safeDirection = "ASC".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(safeDirection, safeField);
    }

    public PriceAlertController(
        PriceAlertService priceAlertService
    ) {
        this.priceAlertService = priceAlertService;
    }

    @PostMapping()
    public ResponseEntity<PriceAlertResponseDto> createPriceAlert(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody PriceAlertRequestDto dto
    ) {
        String userId = userPrincipal.getId();
        PriceAlert priceAlert = this.priceAlertService.addPriceAlert(userId, dto);
        return ResponseEntity.ok(PriceAlertResponseDto.from(priceAlert));
    }

    @GetMapping()
    public ResponseEntity<Page<PriceAlertResponseDto>> getPriceAlertsByUser(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String direction
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        Pageable pageable = PageRequest.of(safePage, safeSize, safeSort(sort, direction));
        String userId = userPrincipal.getId();
        Page<PriceAlert> priceAlerts = this.priceAlertService.getAllByUser(userId, pageable);
        return ResponseEntity.ok(priceAlerts.map(PriceAlertResponseDto::from));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PriceAlertResponseDto> getPriceAlert(
        @PathVariable("id") String id,
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        String userId = userPrincipal.getId();
        PriceAlert priceAlert = this.priceAlertService.getPriceAlert(userId, id);
        return ResponseEntity.ok(PriceAlertResponseDto.from(priceAlert));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PriceAlertResponseDto> updatePriceAlert(
        @PathVariable("id") String id,
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @Valid @RequestBody PriceAlertUpdateRequestDto dto
    ) {
        String userId = userPrincipal.getId();
        PriceAlert priceAlert = this.priceAlertService.updatePriceAlert(id, userId, dto);
        return ResponseEntity.ok(PriceAlertResponseDto.from(priceAlert));
    }

    @DeleteMapping("{id}")
    public ResponseEntity<Void> deletePriceAlert(
        @PathVariable("id") String id,
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        String userId = userPrincipal.getId();
        this.priceAlertService.deletePriceAlert(userId, id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
