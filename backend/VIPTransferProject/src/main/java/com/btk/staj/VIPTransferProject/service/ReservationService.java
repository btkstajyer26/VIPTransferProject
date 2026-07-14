package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.reservation.CreateReservationRequest;
import com.btk.staj.VIPTransferProject.dto.reservation.ReservationResponse;
import com.btk.staj.VIPTransferProject.dto.reservation.UpdateStatusRequest;
import com.btk.staj.VIPTransferProject.entity.ReservationStatusHistory;
import com.btk.staj.VIPTransferProject.repository.ReservationRepository;
import com.btk.staj.VIPTransferProject.repository.ReservationStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationStatusHistoryRepository statusHistoryRepository;

    public ReservationResponse createReservation(CreateReservationRequest request, String phoneNumber) {
        // TODO: kullanıcıyı phoneNumber ile bul, fiyat hesapla, pickup/dropoff zone belirle
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    public ReservationResponse getReservationById(Long id) {
        // TODO: rezervasyonu bul, yetkisiz erişim kontrolü yap
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    public List<ReservationResponse> getAllReservations() {
        // TODO: sadece ADMIN rolü erişebilir; tüm rezervasyonları listele
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    public List<ReservationResponse> getMyReservations(String phoneNumber) {
        // TODO: phoneNumber ile kullanıcıyı bul, user.id ile sorgu yap
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    public ReservationResponse updateStatus(Long id, UpdateStatusRequest request, String phoneNumber) {
        // TODO: durum geçişini doğrula (PDF durum akışına göre), reservation_status_history'e kayıt ekle
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    public void cancelReservation(Long id, String phoneNumber) {
        // TODO: sadece PENDING durumundaki rezervasyonlar iptal edilebilir
        throw new UnsupportedOperationException("Henüz implement edilmedi");
    }

    public List<ReservationStatusHistory> getStatusHistory(Long reservationId) {
        // TODO: rezervasyon sahipliği kontrolü yap
        return statusHistoryRepository.findByReservationIdOrderByChangedAtAsc(reservationId);
    }
}
