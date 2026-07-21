package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CampaignPricingRepository extends JpaRepository<Campaign, Long>{
    Optional<Campaign> findByCodeAndActiveTrue(String code);
}