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
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    /**
     * Aktif araç listesi — kimlik doğrulaması gerektirmez (JWT ekibi SecurityConfig'e ekler).
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
     * Yeni araç ekle — yalnızca ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<VehicleResponse> createVehicle(
            @Valid @RequestBody CreateVehicleRequest request) {
        VehicleResponse created = vehicleService.createVehicle(request);
        return ResponseEntity
                .created(URI.create("/api/v1/vehicles/" + created.getId()))
                .body(created);
    }

    /**
     * Aracı kısmen güncelle — yalnızca ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<VehicleResponse> updateVehicle(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVehicleRequest request) {
        return ResponseEntity.ok(vehicleService.updateVehicle(id, request));
    }

    /**
     * Aracı pasifleştir (soft delete) — yalnızca ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateVehicle(@PathVariable Long id) {
        vehicleService.deactivateVehicle(id);
        return ResponseEntity.noContent().build();
    }
}
