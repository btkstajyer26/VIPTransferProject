package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.loyalty.*;
import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Slf4j
@RestController
@RequestMapping("/api/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    // GiriÅŸ yapan kullanÄ±cÄ±nÄ±n kendi sadakat hesabÄ±
    @GetMapping("/me")
    public ResponseEntity<LoyaltyAccountResponse> getMyAccount(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal.id();
        log.info("HTTP GET /api/loyalty/me isteÄŸi alÄ±ndÄ±. userId={}", userId);
        return ResponseEntity.ok(loyaltyService.getAccount(userId));
    }

    // Admin: herhangi bir kullanÄ±cÄ±nÄ±n sadakat hesabÄ±nÄ± gÃ¶rÃ¼ntÃ¼ler
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/accounts/{userId}")
    public ResponseEntity<LoyaltyAccountResponse> getAccountByUserId(
            @PathVariable Long userId) {
        log.info("HTTP GET /api/loyalty/accounts/{} isteÄŸi alÄ±ndÄ±. (ADMIN)", userId);
        return ResponseEntity.ok(loyaltyService.getAccount(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/tier-config/{tier}")
    public ResponseEntity<LoyaltyTierConfig> updateTierConfig(
        @PathVariable LoyaltyTier tier,
        @RequestBody UpdateTierConfigRequest request) {
            log.info("HTTP PUT /api/loyalty/tier-config/{} isteği alındı. (ADMİN)", tier);
            return ResponseEntity.ok(loyaltyService.updateTierConfig(tier, request));
    }
    /*
    // GiriÅŸ yapan kullanÄ±cÄ± iÃ§in belirli bir tutara uygulanacak indirimi hesaplar
    @GetMapping("/me/discount")
    public ResponseEntity<LoyaltyDiscountResponse> getMyDiscount(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam BigDecimal fare) {
        Long userId = principal.id();
        log.info("HTTP GET /api/loyalty/me/discount isteÄŸi alÄ±ndÄ±. userId={}, fare={}", userId, fare);
        return ResponseEntity.ok(loyaltyService.calculateDiscount(userId, fare));
    }

    // Puan tahakkuku â€” sistem tarafÄ±ndan (rezervasyon COMPLETED olduÄŸunda) tetiklenir.
    // DÄ±ÅŸarÄ±dan keyfi Ã§aÄŸrÄ±lamamasÄ± iÃ§in sadece ADMIN/sistem eriÅŸimine aÃ§Ä±k.
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/accrue")
    public ResponseEntity<Void> accruePoints(@RequestBody AccruePointsRequests request) {
        log.info("HTTP POST /api/loyalty/accrue isteÄŸi alÄ±ndÄ±. userId={}, fareAmount={}",
                request.getUserId(), request.getFareAmount());
        loyaltyService.AccruePoints(request);
        return ResponseEntity.noContent().build();
    }*/
}