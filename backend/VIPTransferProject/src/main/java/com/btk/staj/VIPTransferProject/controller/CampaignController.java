package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.campaign.CampaignRequestDto;
import com.btk.staj.VIPTransferProject.dto.campaign.CampaignResponseDto;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public CampaignResponseDto create(@Valid @RequestBody CampaignRequestDto request,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        return campaignService.create(request, principal.id());
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
    @PreAuthorize("hasRole('ADMIN')")
    public CampaignResponseDto getByCode(@PathVariable String code) {
        return campaignService.getByCode(code);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<CampaignResponseDto> getAll() {
        return campaignService.getAll();
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        campaignService.deactivate(id);
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void activate(@PathVariable Long id) {
        campaignService.activate(id);
    }
}