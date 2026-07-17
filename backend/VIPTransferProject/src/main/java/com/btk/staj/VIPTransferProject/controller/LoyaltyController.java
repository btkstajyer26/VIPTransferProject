package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.loyalty.*;
import com.btk.staj.VIPTransferProject.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/loyalty")
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    @GetMapping("/accounts/{userId}")
    public LoyaltyAccountResponse getAccount(@PathVariable Long userId) {
        return loyaltyService.getAccount(userId);
    }

    @GetMapping("/discount")
    public LoyaltyDiscountResponse getDiscount(@RequestParam Long userId, BigDecimal fare ) {
        return loyaltyService.calculateDiscount(userId, fare);
    }

    @PostMapping("/accrue")
    public void accruePoints(@RequestBody AccruePointsRequests requests) {
        loyaltyService.AccruePoints(requests);
    }
}
