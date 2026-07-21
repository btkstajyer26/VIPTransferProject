package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.LoyaltyAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoyaltyAccountPricingRepository extends JpaRepository<LoyaltyAccount, Long>{
}
