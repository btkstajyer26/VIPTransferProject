package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.service.LocalizationService;
import com.btk.staj.VIPTransferProject.dto.translation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/translations")
@RequiredArgsConstructor
public class TranslationController {

    private final LocalizationService localizationService;

    @GetMapping("/{langCode}")
    public ResponseEntity<Map<String, String>> getAllTranslations(@PathVariable String langCode) {
        log.info("HTTP GET /api/translations/{} isteÄŸi alÄ±ndÄ±.", langCode);
        Map<String, String> translations = localizationService.getAllTranslationsByLang(langCode);
        return ResponseEntity.ok(translations);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<TranslationDto> createTranslation(@RequestBody CreateTranslationRequest request) {
        log.info("HTTP POST /api/translations isteÄŸi alÄ±ndÄ±.");
        return ResponseEntity.ok(localizationService.createTranslation(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<TranslationDto> updateTranslation(@PathVariable Long id, @RequestBody UpdateTranslationRequest request) {
        log.info("HTTP PUT /api/translations/{} isteÄŸi alÄ±ndÄ±.", id);
        return ResponseEntity.ok(localizationService.updateTranslation(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTranslation(@PathVariable Long id) {
        log.info("HTTP DELETE /api/translations/{} isteÄŸi alÄ±ndÄ±.", id);
        localizationService.deleteTranslation(id);
        return ResponseEntity.noContent().build();
    }

    // --- ENTITY TRANSLATION ENDPOINTS ---

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<EntityTranslationDto>> getEntityTranslations(@PathVariable String entityType, @PathVariable Long entityId) {
        log.info("HTTP GET /api/translations/entity/{}/{} isteÄŸi alÄ±ndÄ±.", entityType, entityId);
        return ResponseEntity.ok(localizationService.getEntityTranslations(entityType, entityId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/entity")
    public ResponseEntity<EntityTranslationDto> createEntityTranslation(@RequestBody CreateEntityTranslationRequest request) {
        log.info("HTTP POST /api/translations/entity isteÄŸi alÄ±ndÄ±.");
        return ResponseEntity.ok(localizationService.createEntityTranslation(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/entity/{id}")
    public ResponseEntity<EntityTranslationDto> updateEntityTranslation(@PathVariable Long id, @RequestBody UpdateEntityTranslationRequest request) {
        log.info("HTTP PUT /api/translations/entity/{} isteÄŸi alÄ±ndÄ±.", id);
        return ResponseEntity.ok(localizationService.updateEntityTranslation(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/entity/{id}")
    public ResponseEntity<Void> deleteEntityTranslation(@PathVariable Long id) {
        log.info("HTTP DELETE /api/translations/entity/{} isteÄŸi alÄ±ndÄ±.", id);
        localizationService.deleteEntityTranslation(id);
        return ResponseEntity.noContent().build();
    }
}
