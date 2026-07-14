package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Reservation;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserIdOrderByScheduledTimeDesc(Long userId);

    List<Reservation> findByStatusOrderByScheduledTimeAsc(ReservationStatus status);
}
