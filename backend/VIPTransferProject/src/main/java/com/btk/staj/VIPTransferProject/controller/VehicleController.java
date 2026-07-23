package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.vehicle.CreateVehicleRequest;
import com.btk.staj.VIPTransferProject.dto.vehicle.PublicVehicleResponse;
import com.btk.staj.VIPTransferProject.dto.vehicle.UpdateVehicleRequest;
import com.btk.staj.VIPTransferProject.dto.vehicle.VehicleResponse;
import com.btk.staj.VIPTransferProject.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    /**
     * Aktif araÃ§ listesi â€” kimlik doÄŸrulamasÄ± gerektirmez (JWT ekibi SecurityConfig'e ekler).
     */
    @GetMapping
    public ResponseEntity<List<PublicVehicleResponse>> getActiveVehicles() {
        return ResponseEntity.ok(vehicleService.getActiveVehicles());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<VehicleResponse>> getAllVehicles() {
        return ResponseEntity.ok(vehicleService.getAllVehicles());
    }

    /**
     * Yeni araÃ§ ekle â€” yalnÄ±zca ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<VehicleResponse> createVehicle(
            @Valid @RequestBody CreateVehicleRequest request) {
        VehicleResponse created = vehicleService.createVehicle(request);
        return ResponseEntity
                .created(URI.create("/api/vehicles/" + created.getId()))
                .body(created);
    }

    /**
     * AracÄ± kÄ±smen gÃ¼ncelle â€” yalnÄ±zca ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<VehicleResponse> updateVehicle(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVehicleRequest request) {
        return ResponseEntity.ok(vehicleService.updateVehicle(id, request));
    }

    /**
     * AracÄ± pasifleÅŸtir (soft delete) â€” yalnÄ±zca ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<VehicleResponse> toggleVehicleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(vehicleService.toggleVehicleStatus(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateVehicle(@PathVariable Long id) {
        vehicleService.deactivateVehicle(id);
        return ResponseEntity.noContent().build();
    }
}
