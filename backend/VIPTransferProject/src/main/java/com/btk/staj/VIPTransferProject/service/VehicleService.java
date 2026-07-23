package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.vehicle.CreateVehicleRequest;
import com.btk.staj.VIPTransferProject.dto.vehicle.PublicVehicleResponse;
import com.btk.staj.VIPTransferProject.dto.vehicle.UpdateVehicleRequest;
import com.btk.staj.VIPTransferProject.dto.vehicle.VehicleResponse;
import com.btk.staj.VIPTransferProject.entity.Vehicle;
import com.btk.staj.VIPTransferProject.exception.DuplicatePlateException;
import com.btk.staj.VIPTransferProject.exception.VehicleNotFoundException;
import com.btk.staj.VIPTransferProject.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    /**
     * Aktif araçları başlangıç fiyatına göre artan sırada döndürür (public liste).
     */
    public List<PublicVehicleResponse> getActiveVehicles() {
        return vehicleRepository.findAllByActiveTrueOrderByOpeningPriceAsc()
                .stream()
                .map(this::toPublicResponse)
                .toList();
    }

    public List<VehicleResponse> getAllVehicles() {
        return vehicleRepository.findAllByOrderByActiveDescCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Yeni araç ekler. Plaka benzersizliği kontrol edilir.
     */
    @Transactional
    public VehicleResponse createVehicle(CreateVehicleRequest request) {
        if (vehicleRepository.existsByPlateNumber(request.getPlateNumber())) {
            throw new DuplicatePlateException(request.getPlateNumber());
        }

        Vehicle vehicle = Vehicle.builder()
                .plateNumber(request.getPlateNumber())
                .vehicleClass(request.getVehicleClass())
                .brand(request.getBrand())
                .model(request.getModel())
                .year(request.getYear())
                .color(request.getColor())
                .photoUrl(request.getPhotoUrl())
                .capacity(request.getCapacity())
                .basePriceMultiplier(request.getBasePriceMultiplier())
                .openingPrice(request.getOpeningPrice())
                .build();

        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Yeni araç eklendi. ID: {}, Plaka: {}", saved.getId(), saved.getPlateNumber());
        return toResponse(saved);
    }

    /**
     * Mevcut aracı kısmen günceller. Sadece null olmayan alanlar uygulanır.
     * Plaka değişiyorsa benzersizlik yeniden kontrol edilir.
     */
    @Transactional
    public VehicleResponse updateVehicle(Long id, UpdateVehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findVehicleById(id)
                .orElseThrow(() -> new VehicleNotFoundException(id));

        if (request.getPlateNumber() != null &&
                !request.getPlateNumber().equals(vehicle.getPlateNumber()) &&
                vehicleRepository.existsByPlateNumber(request.getPlateNumber())) {
            throw new DuplicatePlateException(request.getPlateNumber());
        }

        if (request.getPlateNumber()        != null) vehicle.setPlateNumber(request.getPlateNumber());
        if (request.getVehicleClass()       != null) vehicle.setVehicleClass(request.getVehicleClass());
        if (request.getBrand()              != null) vehicle.setBrand(request.getBrand());
        if (request.getModel()              != null) vehicle.setModel(request.getModel());
        if (request.getYear()               != null) vehicle.setYear(request.getYear());
        if (request.getColor()              != null) vehicle.setColor(request.getColor());
        if (request.getPhotoUrl()           != null) vehicle.setPhotoUrl(request.getPhotoUrl());
        if (request.getCapacity()           != null) vehicle.setCapacity(request.getCapacity());
        if (request.getBasePriceMultiplier()!= null) vehicle.setBasePriceMultiplier(request.getBasePriceMultiplier());
        if (request.getOpeningPrice()       != null) vehicle.setOpeningPrice(request.getOpeningPrice());

        Vehicle updated = vehicleRepository.save(vehicle);
        log.info("Araç güncellendi. ID: {}", updated.getId());
        return toResponse(updated);
    }

    @Transactional
    public VehicleResponse toggleVehicleStatus(Long id) {
        Vehicle vehicle = vehicleRepository.findVehicleById(id)
                .orElseThrow(() -> new VehicleNotFoundException(id));
        vehicle.setActive(!vehicle.isActive());
        Vehicle updated = vehicleRepository.save(vehicle);
        log.info("Araç durumu değiştirildi. ID: {}, Yeni durum: {}", id, updated.isActive());
        return toResponse(updated);
    }

    /**
     * Aracı pasifleştirir (soft delete). Geçmiş rezervasyonlar etkilenmez.
     */
    @Transactional
    public void deactivateVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new VehicleNotFoundException(id));
        vehicle.setActive(false);
        vehicleRepository.save(vehicle);
        log.info("Araç pasifleştirildi. ID: {}", id);
    }

    // ── Yardımcı ─────────────────────────────────────────────────────────────

    private PublicVehicleResponse toPublicResponse(Vehicle v) {
        return PublicVehicleResponse.builder()
                .id(v.getId())
                .brand(v.getBrand())
                .model(v.getModel())
                .vehicleClass(v.getVehicleClass())
                .year(v.getYear())
                .color(v.getColor())
                .photoUrl(v.getPhotoUrl())
                .capacity(v.getCapacity())
                .openingPrice(v.getOpeningPrice())
                .build();
    }

    private VehicleResponse toResponse(Vehicle v) {
        return VehicleResponse.builder()
                .id(v.getId())
                .plateNumber(v.getPlateNumber())
                .brand(v.getBrand())
                .model(v.getModel())
                .vehicleClass(v.getVehicleClass())
                .year(v.getYear())
                .color(v.getColor())
                .photoUrl(v.getPhotoUrl())
                .capacity(v.getCapacity())
                .openingPrice(v.getOpeningPrice())
                .basePriceMultiplier(v.getBasePriceMultiplier())
                .active(v.isActive())
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .build();
    }
}
