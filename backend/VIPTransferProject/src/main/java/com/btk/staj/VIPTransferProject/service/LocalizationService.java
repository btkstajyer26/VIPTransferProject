package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.translation.*;
import com.btk.staj.VIPTransferProject.entity.EntityTranslation;
import com.btk.staj.VIPTransferProject.entity.Translation;
import com.btk.staj.VIPTransferProject.exception.InvalidRequestException;
import com.btk.staj.VIPTransferProject.exception.ResourceNotFoundException;
import com.btk.staj.VIPTransferProject.repository.CampaignRepository;
import com.btk.staj.VIPTransferProject.repository.EntityTranslationRepository;
import com.btk.staj.VIPTransferProject.repository.TranslationRepository;
import com.btk.staj.VIPTransferProject.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocalizationService {

    private final TranslationRepository translationRepository;
    private final EntityTranslationRepository entityTranslationRepository;

    // Diğer servislerin Repositories'leri (Validasyon için)
    private final CampaignRepository campaignRepository;
    private final VehicleRepository vehicleRepository;

    // --- STATİK METİN (TRANSLATION) İŞLEMLERİ ---

    public String getTranslation(String transKey, String langCode, String defaultMessage) {
        return translationRepository.findByTransKeyAndLangCode(transKey, langCode)
                .map(Translation::getValue)
                .orElse(defaultMessage != null ? defaultMessage : transKey);
    }

    public Map<String, String> getAllTranslationsByLang(String langCode) {
        return translationRepository.findByLangCode(langCode).stream()
                .collect(Collectors.toMap(Translation::getTransKey, Translation::getValue));
    }

    public TranslationDto createTranslation(CreateTranslationRequest request) {
        Translation translation = Translation.builder()
                .transKey(request.getTransKey())
                .langCode(request.getLangCode())
                .value(request.getValue())
                .build();
        Translation saved = translationRepository.save(translation);
        return toDto(saved);
    }

    public TranslationDto updateTranslation(Long id, UpdateTranslationRequest request) {
        Translation translation = translationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Çeviri bulunamadı: " + id));
        translation.setValue(request.getValue());
        Translation saved = translationRepository.save(translation);
        return toDto(saved);
    }

    public void deleteTranslation(Long id) {
        translationRepository.deleteById(id);
    }

    private TranslationDto toDto(Translation t) {
        return TranslationDto.builder()
                .id(t.getId())
                .transKey(t.getTransKey())
                .langCode(t.getLangCode())
                .value(t.getValue())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    // --- DİNAMİK VERİ (ENTITY TRANSLATION) İŞLEMLERİ ---

    public String getEntityTranslation(String entityType, Long entityId, String fieldName, String langCode, String defaultValue) {
        return entityTranslationRepository.findByEntityTypeAndEntityIdAndFieldNameAndLangCode(entityType, entityId, fieldName, langCode)
                .map(EntityTranslation::getValue)
                .orElse(defaultValue);
    }

    public List<EntityTranslationDto> getEntityTranslations(String entityType, Long entityId) {
        return entityTranslationRepository.findByEntityTypeAndEntityId(entityType, entityId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public EntityTranslationDto createEntityTranslation(CreateEntityTranslationRequest request) {
        // Yabancı servislerden gelen entity id doğrulama
        validateEntityExists(request.getEntityType(), request.getEntityId());

        EntityTranslation et = EntityTranslation.builder()
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .fieldName(request.getFieldName())
                .langCode(request.getLangCode())
                .value(request.getValue())
                .build();
        EntityTranslation saved = entityTranslationRepository.save(et);
        return toDto(saved);
    }

    public EntityTranslationDto updateEntityTranslation(Long id, UpdateEntityTranslationRequest request) {
        EntityTranslation et = entityTranslationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entity Çevirisi bulunamadı: " + id));
        et.setValue(request.getValue());
        EntityTranslation saved = entityTranslationRepository.save(et);
        return toDto(saved);
    }

    public void deleteEntityTranslation(Long id) {
        entityTranslationRepository.deleteById(id);
    }

    private void validateEntityExists(String entityType, Long entityId) {
        switch (entityType.toLowerCase()) {
            case "campaign":
                campaignRepository.findById(entityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Kampanya bulunamadı: " + entityId));
                break;
            case "vehicle":
                vehicleRepository.findById(entityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Araç bulunamadı: " + entityId));
                break;
            case "pricing_zone":
            case "pricing_rule":
            case "loyalty_tier":
                // DİKKAT: Diğer servisler (Pricing, Loyalty) henüz tamamlanmadığı için
                // bu entity'leri doğrulayacak repository'ler yok.
                // İstendiği üzere ileride eklenecek olan veriler şimdilik null değişkenle mocklandı.
                Object pendingServiceData = null; 
                break;
            default:
                throw new InvalidRequestException("Geçersiz entityType: " + entityType);
        }
    }

    private EntityTranslationDto toDto(EntityTranslation et) {
        return EntityTranslationDto.builder()
                .id(et.getId())
                .entityType(et.getEntityType())
                .entityId(et.getEntityId())
                .fieldName(et.getFieldName())
                .langCode(et.getLangCode())
                .value(et.getValue())
                .createdAt(et.getCreatedAt())
                .updatedAt(et.getUpdatedAt())
                .build();
    }
}
