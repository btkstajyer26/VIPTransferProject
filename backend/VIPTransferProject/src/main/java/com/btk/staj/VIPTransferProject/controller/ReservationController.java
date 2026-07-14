package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.entity.ReservationStatusHistory;
import com.btk.staj.VIPTransferProject.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    // Yeni rezervasyon oluştur (kayıtlı kullanıcı veya misafir)
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            @RequestBody CreateReservationRequest request,
            Principal principal) {
        log.info("HTTP POST /api/v1/reservations isteği alındı.");
        ReservationResponse response = reservationService.createReservation(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Tüm rezervasyonları listele (ADMIN)
    @GetMapping
    public ResponseEntity<List<ReservationResponse>> getAllReservations() {
        log.info("HTTP GET /api/v1/reservations isteği alındı.");
        return ResponseEntity.ok(reservationService.getAllReservations());
    }

    // Giriş yapan kullanıcının kendi rezervasyonları
    @GetMapping("/my")
    public ResponseEntity<List<ReservationResponse>> getMyReservations(Principal principal) {
        log.info("HTTP GET /api/v1/reservations/my isteği alındı: {}", principal.getName());
        return ResponseEntity.ok(reservationService.getMyReservations(principal.getName()));
    }

    // Tekil rezervasyon getir
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> getReservationById(@PathVariable Long id) {
        log.info("HTTP GET /api/v1/reservations/{} isteği alındı.", id);
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    // Durum güncelle: PENDING→ASSIGNED, ASSIGNED→COMPLETED / NO_SHOW, PENDING/ASSIGNED→CANCELLED
    @PatchMapping("/{id}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request,
            Principal principal) {
        log.info("HTTP PATCH /api/v1/reservations/{}/status isteği alındı. Yeni durum: {}", id, request.getStatus());
        return ResponseEntity.ok(reservationService.updateStatus(id, request, principal.getName()));
    }

    // Rezervasyonu iptal et (sadece PENDING durumunda)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelReservation(@PathVariable Long id, Principal principal) {
        log.info("HTTP DELETE /api/v1/reservations/{} isteği alındı.", id);
        reservationService.cancelReservation(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    // Rezervasyonun durum geçmişini getir
    @GetMapping("/{id}/history")
    public ResponseEntity<List<ReservationStatusHistory>> getStatusHistory(@PathVariable Long id) {
        log.info("HTTP GET /api/v1/reservations/{}/history isteği alındı.", id);
        return ResponseEntity.ok(reservationService.getStatusHistory(id));
    }
}
