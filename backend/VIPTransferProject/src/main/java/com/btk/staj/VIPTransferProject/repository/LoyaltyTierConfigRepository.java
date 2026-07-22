package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoyaltyTierConfigRepository extends JpaRepository<LoyaltyTierConfig, Long> {

    Optional<LoyaltyTierConfig> findByTier(LoyaltyTier tier);

    List<LoyaltyTierConfig> findAllByOrderByMinPointsDesc();

}