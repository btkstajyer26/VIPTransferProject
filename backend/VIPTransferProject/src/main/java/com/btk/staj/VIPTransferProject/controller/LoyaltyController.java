package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.loyalty.*;
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
@RequestMapping("/api/v1/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    // Giriş yapan kullanıcının kendi sadakat hesabı
    @GetMapping("/me")
    public ResponseEntity<LoyaltyAccountResponse> getMyAccount(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal.id();
        log.info("HTTP GET /api/v1/loyalty/me isteği alındı. userId={}", userId);
        return ResponseEntity.ok(loyaltyService.getAccount(userId));
    }

    // Admin: herhangi bir kullanıcının sadakat hesabını görüntüler
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/accounts/{userId}")
    public ResponseEntity<LoyaltyAccountResponse> getAccountByUserId(
            @PathVariable Long userId) {
        log.info("HTTP GET /api/v1/loyalty/accounts/{} isteği alındı. (ADMIN)", userId);
        return ResponseEntity.ok(loyaltyService.getAccount(userId));
    }

    // Giriş yapan kullanıcı için belirli bir tutara uygulanacak indirimi hesaplar
    @GetMapping("/me/discount")
    public ResponseEntity<LoyaltyDiscountResponse> getMyDiscount(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam BigDecimal fare) {
        Long userId = principal.id();
        log.info("HTTP GET /api/v1/loyalty/me/discount isteği alındı. userId={}, fare={}", userId, fare);
        return ResponseEntity.ok(loyaltyService.calculateDiscount(userId, fare));
    }

    // Puan tahakkuku — sistem tarafından (rezervasyon COMPLETED olduğunda) tetiklenir.
    // Dışarıdan keyfi çağrılamaması için sadece ADMIN/sistem erişimine açık.
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/accrue")
    public ResponseEntity<Void> accruePoints(@RequestBody AccruePointsRequests request) {
        log.info("HTTP POST /api/v1/loyalty/accrue isteği alındı. userId={}, fareAmount={}",
                request.getUserId(), request.getFareAmount());
        loyaltyService.AccruePoints(request);
        return ResponseEntity.noContent().build();
    }
}