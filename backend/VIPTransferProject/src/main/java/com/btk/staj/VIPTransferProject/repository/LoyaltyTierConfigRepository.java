package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoyaltyTierConfigRepository extends JpaRepository<LoyaltyTierConfig,Long> {
    Optional<LoyaltyTierConfig> findByTier(LoyaltyTier tier);

    List<LoyaltyTierConfig> findAllByOrderByMinPointsDesc();
}
