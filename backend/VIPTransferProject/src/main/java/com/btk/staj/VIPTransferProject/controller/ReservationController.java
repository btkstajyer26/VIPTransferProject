package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.GuestReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationStatusHistoryResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    // KayÄ±tlÄ± kullanÄ±cÄ±: token'dan userId alÄ±nÄ±r. Misafir: token yok, phoneNumber ile.
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String phoneNumber,
            @RequestBody CreateReservationRequest request) {
        Long userId = principal != null ? principal.id() : null;
        log.info("HTTP POST /api/reservations isteÄŸi alÄ±ndÄ±. userId={}, phoneNumber={}", userId, phoneNumber);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.createReservation(request, userId, phoneNumber));
    }

    // TÃ¼m rezervasyonlarÄ± listele â€” sadece ADMIN eriÅŸebilir.
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<ReservationResponse>> getAllReservations() {
        log.info("HTTP GET /api/reservations isteÄŸi alÄ±ndÄ±. (ADMIN)");
        return ResponseEntity.ok(reservationService.getAllReservations());
    }

    // GiriÅŸ yapan kullanÄ±cÄ±nÄ±n rezervasyonlarÄ±
    @GetMapping("/my")
    public ResponseEntity<List<ReservationResponse>> getMyReservations(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal.id();
        log.info("HTTP GET /api/reservations/my isteÄŸi alÄ±ndÄ±. userId={}", userId);
        return ResponseEntity.ok(reservationService.getMyReservations(userId));
    }

    // Tekil rezervasyon getir
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> getReservationById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal.id();
        log.info("HTTP GET /api/reservations/{} isteÄŸi alÄ±ndÄ±. userId={}", id, userId);
        return ResponseEntity.ok(reservationService.getReservationById(id, userId));
    }

    // Durum gÃ¼ncelle: PENDINGâ†’ASSIGNED, ASSIGNEDâ†’COMPLETED / NO_SHOW, PENDING/ASSIGNEDâ†’CANCELLED
    @PatchMapping("/{id}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateStatusRequest request) {
        Long userId = principal.id();
        log.info("HTTP PATCH /api/reservations/{}/status isteÄŸi alÄ±ndÄ±. userId={}, yeni durum={}", id, userId, request.getStatus());
        return ResponseEntity.ok(reservationService.updateStatus(id, request, userId));
    }

    // Rezervasyonu iptal et (sadece PENDING durumunda)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelReservation(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal.id();
        log.info("HTTP DELETE /api/reservations/{} isteÄŸi alÄ±ndÄ±. userId={}", id, userId);
        reservationService.cancelReservation(id, userId);
        return ResponseEntity.noContent().build();
    }

    // Misafir rezervasyon gÃ¶rÃ¼ntÃ¼leme â€” bookingReference + telefon eÅŸleÅŸmesiyle doÄŸrular.
    // TODO(): SMS doÄŸrulama kodu ile gerÃ§ek misafir kimlik doÄŸrulamasÄ±.
    @GetMapping("/guest/{bookingReference}")
    public ResponseEntity<GuestReservationResponse> getGuestReservation(
            @PathVariable String bookingReference,
            @RequestParam String phone) {
        log.info("HTTP GET /api/reservations/guest/{} isteÄŸi alÄ±ndÄ±. (misafir gÃ¶rÃ¼ntÃ¼leme)", bookingReference);
        return ResponseEntity.ok(reservationService.getGuestReservation(bookingReference, phone));
    }

    // Rezervasyonun durum geÃ§miÅŸini getir
    @GetMapping("/{id}/history")
    public ResponseEntity<List<ReservationStatusHistoryResponse>> getStatusHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal.id();
        log.info("HTTP GET /api/reservations/{}/history isteÄŸi alÄ±ndÄ±. userId={}", id, userId);
        return ResponseEntity.ok(reservationService.getStatusHistory(id, userId));
    }
}
