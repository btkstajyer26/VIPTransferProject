package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.pricing.PricingZoneRequestDto;
import com.btk.staj.VIPTransferProject.dto.pricing.PricingZoneResponseDto;
import com.btk.staj.VIPTransferProject.service.PricingZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pricing-zones")
@RequiredArgsConstructor
public class PricingZoneController {

    private final PricingZoneService pricingZoneService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public PricingZoneResponseDto create(@Valid @RequestBody PricingZoneRequestDto request) {
        return pricingZoneService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PricingZoneResponseDto update(@PathVariable Long id,
                                         @Valid @RequestBody PricingZoneRequestDto request) {
        return pricingZoneService.update(id, request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PricingZoneResponseDto getById(@PathVariable Long id) {
        return pricingZoneService.getById(id);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<PricingZoneResponseDto> getAllActive() {
        return pricingZoneService.getAllActive();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deactivate(@PathVariable Long id) {
        pricingZoneService.deactivate(id);
    }
}