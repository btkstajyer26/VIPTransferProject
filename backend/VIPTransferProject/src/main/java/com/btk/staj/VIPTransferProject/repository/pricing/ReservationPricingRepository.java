package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.Reservation;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReservationPricingRepository extends JpaRepository<Reservation, Long>{
    @Query("""
        SELECT COUNT(r) FROM Reservation r
        WHERE r.user.id = :userId
          AND r.campaign.id = :campaignId
          AND r.status <> :cancelledStatus
        """)
    long countUsedCampaignByUser(
            @Param("userId") Long userId,
            @Param("campaignId") Long campaignId,
            @Param("cancelledStatus") ReservationStatus cancelledStatus
    );
}