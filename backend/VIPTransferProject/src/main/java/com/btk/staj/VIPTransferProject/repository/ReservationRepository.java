package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findAllByOrderByScheduledTimeDesc();

    List<Reservation> findByUserIdOrderByScheduledTimeDesc(Long userId);

    Reservation findOneById(Long id);

    Reservation findByBookingReference(String bookingReference);
}
