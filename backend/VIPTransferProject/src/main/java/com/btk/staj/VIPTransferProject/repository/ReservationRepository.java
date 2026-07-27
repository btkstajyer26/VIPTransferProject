package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findAllByOrderByScheduledTimeDesc();

    List<Reservation> findByUserIdOrderByScheduledTimeDesc(Long userId);

    Reservation findOneById(Long id);

    Reservation findByBookingReference(String bookingReference);

    @Query(value = "SELECT COUNT(r.id) FROM reservations r WHERE r.user_id = :userId AND r.campaign_id = :campaignId AND r.status <> CAST(:status AS reservation_status)", nativeQuery = true)
    long countByUserIdAndCampaignIdAndStatusNot(@Param("userId") Long userId, @Param("campaignId") Long campaignId, @Param("status") String status);
}
