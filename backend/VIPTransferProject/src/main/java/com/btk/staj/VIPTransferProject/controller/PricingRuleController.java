package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.pricing.PricingRuleRequestDto;
import com.btk.staj.VIPTransferProject.dto.pricing.PricingRuleResponseDto;
import com.btk.staj.VIPTransferProject.service.PricingRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pricing-rules")
@RequiredArgsConstructor
public class PricingRuleController {

    private final PricingRuleService pricingRuleService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public PricingRuleResponseDto create(@Valid @RequestBody PricingRuleRequestDto request) {
        return pricingRuleService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PricingRuleResponseDto update(@PathVariable Long id,
                                         @Valid @RequestBody PricingRuleRequestDto request) {
        return pricingRuleService.update(id, request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PricingRuleResponseDto getById(@PathVariable Long id) {
        return pricingRuleService.getById(id);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<PricingRuleResponseDto> getByZone(@RequestParam Long zoneId) {
        return pricingRuleService.getByZone(zoneId);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        pricingRuleService.deactivate(id);
    }
}