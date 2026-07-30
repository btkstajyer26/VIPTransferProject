package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.campaign.CampaignRequestDto;
import com.btk.staj.VIPTransferProject.dto.campaign.CampaignResponseDto;
import com.btk.staj.VIPTransferProject.entity.Campaign;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.event.CampaignPublishedEvent;
import com.btk.staj.VIPTransferProject.exception.InvalidPricingRuleException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.repository.CampaignRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public CampaignResponseDto create(CampaignRequestDto request, Long adminId) {
        validate(request);

        User createdBy = resolveCreatedBy(adminId);

        Campaign campaign = Campaign.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .minOrderAmount(resolveMinOrderAmount(request.getMinOrderAmount()))
                .maxUses(request.getMaxUses())
                .maxUsesPerUser(resolveMaxUsesPerUser(request.getMaxUsesPerUser()))
                .validFrom(request.getValidFrom())
                .validTo(request.getValidTo())
                .createdBy(createdBy)
                .build();

        Campaign saved = campaignRepository.save(campaign);
        eventPublisher.publishEvent(new CampaignPublishedEvent(saved.getId()));
        return toResponse(saved);
    }

    @Transactional
    public CampaignResponseDto update(Long id, CampaignRequestDto request) {
        validate(request);

        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign bulunamadı: id=" + id));

        campaign.setCode(request.getCode());
        campaign.setName(request.getName());
        campaign.setDescription(request.getDescription());
        campaign.setDiscountType(request.getDiscountType());
        campaign.setDiscountValue(request.getDiscountValue());
        campaign.setMaxDiscountAmount(request.getMaxDiscountAmount());
        campaign.setMinOrderAmount(resolveMinOrderAmount(request.getMinOrderAmount()));
        campaign.setMaxUses(request.getMaxUses());
        campaign.setMaxUsesPerUser(resolveMaxUsesPerUser(request.getMaxUsesPerUser()));
        campaign.setValidFrom(request.getValidFrom());
        campaign.setValidTo(request.getValidTo());

        return toResponse(campaignRepository.save(campaign));
    }

    public CampaignResponseDto getById(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign bulunamadı: id=" + id));
        return toResponse(campaign);
    }

    public CampaignResponseDto getByCode(String code) {
        Campaign campaign = campaignRepository.findByCodeAndActiveTrue(code)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign bulunamadı: code=" + code));
        return toResponse(campaign);
    }

    public List<CampaignResponseDto> getAll() {
        return campaignRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deactivate(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign bulunamadı: id=" + id));
        campaign.setActive(false);
        campaignRepository.save(campaign);
    }

    @Transactional
    public void activate(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign bulunamadı: id=" + id));
        campaign.setActive(true);
        campaignRepository.save(campaign);
    }

    // --- iş kuralı validasyonu ---
    private void validate(CampaignRequestDto request) {
        if (!request.getValidTo().isAfter(request.getValidFrom())) {
            throw new InvalidPricingRuleException("validTo, validFrom'dan sonra olmalıdır.");
        }
    }

    private User resolveCreatedBy(Long createdById) {
        if (createdById == null) {
            return null;
        }
        return userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("User bulunamadı: id=" + createdById));
    }

    private BigDecimal resolveMinOrderAmount(BigDecimal minOrderAmount) {
        return minOrderAmount != null ? minOrderAmount : BigDecimal.ZERO;
    }

    private Integer resolveMaxUsesPerUser(Integer maxUsesPerUser) {
        return maxUsesPerUser != null ? maxUsesPerUser : 1;
    }

    private CampaignResponseDto toResponse(Campaign campaign) {
        return CampaignResponseDto.builder()
                .id(campaign.getId())
                .code(campaign.getCode())
                .name(campaign.getName())
                .description(campaign.getDescription())
                .discountType(campaign.getDiscountType())
                .discountValue(campaign.getDiscountValue())
                .maxDiscountAmount(campaign.getMaxDiscountAmount())
                .minOrderAmount(campaign.getMinOrderAmount())
                .maxUses(campaign.getMaxUses())
                .usedCount(campaign.getUsedCount())
                .maxUsesPerUser(campaign.getMaxUsesPerUser())
                .validFrom(campaign.getValidFrom())
                .validTo(campaign.getValidTo())
                .active(campaign.isActive())
                .createdById(campaign.getCreatedBy() != null ? campaign.getCreatedBy().getId() : null)
                .createdByName(campaign.getCreatedBy() != null
                        ? campaign.getCreatedBy().getFirstName() + " " + campaign.getCreatedBy().getLastName()
                        : null)
                .createdAt(campaign.getCreatedAt())
                .updatedAt(campaign.getUpdatedAt())
                .build();
    }
}
