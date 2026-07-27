package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.campaign.CampaignRequestDto;
import com.btk.staj.VIPTransferProject.dto.campaign.CampaignResponseDto;
import com.btk.staj.VIPTransferProject.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CampaignResponseDto create(@Valid @RequestBody CampaignRequestDto request) {
        return campaignService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CampaignResponseDto update(@PathVariable Long id,
                                      @Valid @RequestBody CampaignRequestDto request) {
        return campaignService.update(id, request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CampaignResponseDto getById(@PathVariable Long id) {
        return campaignService.getById(id);
    }

    @GetMapping("/code/{code}")
    // Not: authentication gerekiyor ama rol kısıtı yok — müşteri de erişebilir
    public CampaignResponseDto getByCode(@PathVariable String code) {
        return campaignService.getByCode(code);
    }

    @GetMapping
    // Not: authentication gerekiyor ama rol kısıtı yok — müşteri de erişebilir
    public List<CampaignResponseDto> getAll() {
        return campaignService.getAll();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        campaignService.deactivate(id);
    }
}