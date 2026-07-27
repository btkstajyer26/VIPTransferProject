package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.notification.FirebaseInstallationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.RegisterFirebaseInstallationRequest;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.UserFirebaseInstallationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/firebase-installations")
@RequiredArgsConstructor
public class UserFirebaseInstallationController {

    private final UserFirebaseInstallationService installationService;

    @PostMapping
    public ResponseEntity<FirebaseInstallationResponse> register(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RegisterFirebaseInstallationRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(installationService.register(principal.phoneNumber(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        installationService.deactivate(principal.phoneNumber(), id);
        return ResponseEntity.noContent().build();
    }
}
