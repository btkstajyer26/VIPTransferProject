package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoyaltyTierConfigRepository extends JpaRepository<LoyaltyTierConfig, Integer> {

    Optional<LoyaltyTierConfig> findByTier(LoyaltyTier tier);
}