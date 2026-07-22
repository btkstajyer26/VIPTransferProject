package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.pricing.PricingRuleRequestDto;
import com.btk.staj.VIPTransferProject.dto.pricing.PricingRuleResponseDto;
import com.btk.staj.VIPTransferProject.entity.PricingRule;
import com.btk.staj.VIPTransferProject.entity.PricingZone;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.exception.InvalidPricingRuleException;
import com.btk.staj.VIPTransferProject.repository.pricing.PricingRuleRepository;
import com.btk.staj.VIPTransferProject.repository.pricing.PricingZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PricingRuleService {
    private final PricingRuleRepository pricingRuleRepository;
    private final PricingZoneRepository pricingZoneRepository;

    @Transactional
    public PricingRuleResponseDto create(PricingRuleRequestDto request) {
        validate(request);

        PricingZone zone = pricingZoneRepository.findById(request.getZoneId()).orElseThrow(()-> new ResourceNotFoundException("PricingZone bulunamadı id = " + request.getZoneId()));

        PricingRule rule = PricingRule.builder()
                .zone(zone)
                .name(request.getName())
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .multiplier(request.getMultiplier())
                .reason(request.getReason())
                .validFrom(request.getValidFrom())
                .validTo(request.getValidTo())
                .build();

        PricingRule saved = pricingRuleRepository.save(rule);
        return toResponse(saved);
    }

    @Transactional
    public PricingRuleResponseDto update(Long id, PricingRuleRequestDto request){
        validate(request);

        PricingRule rule = pricingRuleRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("PricingRule bulunamadı: id=" + id));

        if(!rule.getZone().getId().equals(request.getZoneId())){
            PricingZone newZone = pricingZoneRepository.findById(request.getZoneId()).orElseThrow(() -> new ResourceNotFoundException("PricingZone bulunamadı: id=" + request.getZoneId()));
            rule.setZone(newZone);
        }
        rule.setName(request.getName());
        rule.setDayOfWeek(request.getDayOfWeek());
        rule.setStartTime(request.getStartTime());
        rule.setEndTime(request.getEndTime());
        rule.setMultiplier(request.getMultiplier());
        rule.setReason(request.getReason());
        rule.setValidFrom(request.getValidFrom());
        rule.setValidTo(request.getValidTo());

        return toResponse(rule);
    }

    public PricingRuleResponseDto getById(Long id) {
        PricingRule rule = pricingRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PricingRule bulunamadı: id=" + id));
        return toResponse(rule);
    }

    public List<PricingRuleResponseDto> getByZone(Long zoneId) {
        return pricingRuleRepository.findByZoneIdAndActiveTrue(zoneId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deactivate(Long id) {
        PricingRule rule = pricingRuleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("PricingRule bulunamadı: id=" + id));
        rule.setActive(false);
    }

    private void validate(PricingRuleRequestDto request) {
        if (request.getStartTime().equals(request.getEndTime())) {
            throw new InvalidPricingRuleException(
                    "startTime ve endTime birbirine eşit olamaz (24 saatlik/belirsiz kural desteklenmiyor).");
        }

        boolean isOvernight = request.getEndTime().isBefore(request.getStartTime());

        if (isOvernight) {
            validateOvernightRule(request);
        } else {
            validateNormalRule(request);
        }
    }

    private void validateOvernightRule(PricingRuleRequestDto request) {
        if (request.getValidFrom() == null || request.getValidTo() == null) {
            throw new InvalidPricingRuleException(
                    "Gece yarısını aşan kurallar için (endTime < startTime) " +
                            "validFrom ve validTo zorunludur ve ardışık iki günü işaret etmelidir " +
                            "(örn. validFrom=19.07.2026, validTo=20.07.2026).");
        }

        if (!request.getValidTo().equals(request.getValidFrom().plusDays(1))) {
            throw new InvalidPricingRuleException(
                    "Gece yarısını aşan kurallarda validTo, validFrom'un tam bir sonraki günü olmalıdır.");
        }

        if (request.getDayOfWeek() != null) {
            throw new InvalidPricingRuleException(
                    "Gece yarısını aşan kurallarda dayOfWeek belirtilmemelidir (null olmalı); " +
                            "eşleşme validFrom/validTo tarihine göre yapılır.");
        }
    }

    private void validateNormalRule(PricingRuleRequestDto request) {
        if (request.getValidFrom() != null && request.getValidTo() != null
                && request.getValidTo().isBefore(request.getValidFrom())) {
            throw new InvalidPricingRuleException("validTo, validFrom'dan önce olamaz");
        }
    }

    private PricingRuleResponseDto toResponse(PricingRule rule) {
        return PricingRuleResponseDto.builder()
                .id(rule.getId())
                .zoneId(rule.getZone().getId())
                .zoneName(rule.getZone().getName())
                .name(rule.getName())
                .dayOfWeek(rule.getDayOfWeek())
                .startTime(rule.getStartTime())
                .endTime(rule.getEndTime())
                .multiplier(rule.getMultiplier())
                .reason(rule.getReason())
                .validFrom(rule.getValidFrom())
                .validTo(rule.getValidTo())
                .active(rule.isActive())
                .createdAt(rule.getCreatedAt())
                .build();
    }
}



