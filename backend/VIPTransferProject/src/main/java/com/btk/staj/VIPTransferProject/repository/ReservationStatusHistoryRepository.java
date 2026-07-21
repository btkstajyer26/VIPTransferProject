package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.ReservationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservationStatusHistoryRepository extends JpaRepository<ReservationStatusHistory, Long> {

    List<ReservationStatusHistory> findByReservationIdOrderByChangedAtAsc(Long reservationId);
}
