package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.entity.ReservationStatusHistory;
import com.btk.staj.VIPTransferProject.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    // Kayıtlı kullanıcı: userId dolu, phoneNumber boş olabilir
    // Misafir: userId boş, phoneNumber dolu
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String phoneNumber,
            @RequestBody CreateReservationRequest request) {
        log.info("HTTP POST /api/v1/reservations isteği alındı. userId={}, phoneNumber={}", userId, phoneNumber);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.createReservation(request, userId, phoneNumber));
    }

    // Tüm rezervasyonları listele — sadece ADMIN erişebilir
    // JWT ekibi token'a role claim'i ekleyince @PreAuthorize otomatik devreye girer
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<ReservationResponse>> getAllReservations() {
        log.info("HTTP GET /api/v1/reservations isteği alındı.");
        return ResponseEntity.ok(reservationService.getAllReservations());
    }

    // Giriş yapan kullanıcının rezervasyonları
    @GetMapping("/my")
    public ResponseEntity<List<ReservationResponse>> getMyReservations(
            @RequestParam Long userId) {
        log.info("HTTP GET /api/v1/reservations/my isteği alındı. userId={}", userId);
        return ResponseEntity.ok(reservationService.getMyReservations(userId));
    }

    // Tekil rezervasyon getir
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> getReservationById(
            @PathVariable Long id,
            @RequestParam Long userId) {
        log.info("HTTP GET /api/v1/reservations/{} isteği alındı. userId={}", id, userId);
        return ResponseEntity.ok(reservationService.getReservationById(id, userId));
    }

    // Durum güncelle: PENDING→ASSIGNED, ASSIGNED→COMPLETED / NO_SHOW, PENDING/ASSIGNED→CANCELLED
    @PatchMapping("/{id}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody UpdateStatusRequest request) {
        log.info("HTTP PATCH /api/v1/reservations/{}/status isteği alındı. userId={}, yeni durum={}", id, userId, request.getStatus());
        return ResponseEntity.ok(reservationService.updateStatus(id, request, userId));
    }

    // Rezervasyonu iptal et (sadece PENDING durumunda)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelReservation(
            @PathVariable Long id,
            @RequestParam Long userId) {
        log.info("HTTP DELETE /api/v1/reservations/{} isteği alındı. userId={}", id, userId);
        reservationService.cancelReservation(id, userId);
        return ResponseEntity.noContent().build();
    }

    // Rezervasyonun durum geçmişini getir
    @GetMapping("/{id}/history")
    public ResponseEntity<List<ReservationStatusHistory>> getStatusHistory(
            @PathVariable Long id,
            @RequestParam Long userId) {
        log.info("HTTP GET /api/v1/reservations/{}/history isteği alındı. userId={}", id, userId);
        return ResponseEntity.ok(reservationService.getStatusHistory(id, userId));
    }
}
