package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.notification.FirebaseInstallationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.RegisterFirebaseInstallationRequest;
import com.btk.staj.VIPTransferProject.service.UserFirebaseInstallationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/firebase-installations")
@RequiredArgsConstructor
public class UserFirebaseInstallationController {

    private final UserFirebaseInstallationService installationService;

    @PostMapping
    public ResponseEntity<FirebaseInstallationResponse> register(
            Authentication authentication,
            @Valid @RequestBody RegisterFirebaseInstallationRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(installationService.register(authentication.getName(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(
            Authentication authentication,
            @PathVariable Long id
    ) {
        installationService.deactivate(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
