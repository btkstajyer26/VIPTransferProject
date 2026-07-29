package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    Optional<Campaign> findByCodeAndActiveTrue(String code);

    @Modifying
    @Query("UPDATE Campaign c SET c.usedCount = c.usedCount + 1 " +
            "WHERE c.id = :id AND (c.maxUses IS NULL OR c.usedCount < c.maxUses)")
    int incrementUsedCountIfAvailable(@Param("id") Long id);
}
