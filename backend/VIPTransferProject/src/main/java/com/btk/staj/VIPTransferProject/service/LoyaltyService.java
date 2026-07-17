package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.loyalty.*;
import com.btk.staj.VIPTransferProject.entity.LoyaltyAccount;
import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.repository.LoyaltyAccountRepository;
import com.btk.staj.VIPTransferProject.repository.LoyaltyTierConfigRepository;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final LoyaltyTierConfigRepository loyaltyTierConfigRepository;

    public LoyaltyAccountResponse getAccount(Long userId){
        LoyaltyAccount account = findAccountOrThrow(userId);
        return toResponse(account);
    }

    public LoyaltyDiscountResponse calculateDiscount(Long userId, BigDecimal fareAmount){
        LoyaltyAccount account = findAccountOrThrow(userId);
        LoyaltyTierConfig config = findTierConfigOrThrow(account.getTier());

        BigDecimal discountAmount = fareAmount
                .multiply(config.getDiscountPercentage())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        return LoyaltyDiscountResponse.builder()
                .userId(userId)
                .tier(account.getTier().name())
                .discountPercentage(config.getDiscountPercentage())
                .discountAmount(discountAmount)
                .build();

    }

    @Transactional
    public void AccurePoints(AccurePointsRequests requests){
        LoyaltyAccount account = findAccountOrThrow(requests.getUserId());
        LoyaltyTierConfig currenrtConfig = findTierConfigOrThrow(account.getTier());

        int earnedPoints = requests.getFareAmount()
                .multiply(currenrtConfig.getEarnRate())
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();

        int newLifeTimePoints = account.getLifetimePoints() +  earnedPoints;
        account.setLifetimePoints(newLifeTimePoints);

        List<LoyaltyTierConfig> tiersDesc = loyaltyTierConfigRepository.findAllByOrderByMinPointsDesc();
        for (LoyaltyTierConfig tier : tiersDesc) {
            if (newLifeTimePoints >= tier.getMinPoints()) {
                account.setTier(tier.getTier());
                break;
            }
        }

        account.setUpdatedAt(OffsetDateTime.now());
        loyaltyAccountRepository.save(account);
    }

    private LoyaltyAccount findAccountOrThrow(Long userId) {
        return  loyaltyAccountRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }

    private LoyaltyTierConfig findTierConfigOrThrow(com.btk.staj.VIPTransferProject.enums.LoyaltyTier tier) {
        return loyaltyTierConfigRepository.findByTier(tier)
                .orElseThrow(() -> new IllegalStateException("Tier config bulunamadı: "+tier));
    }

    private LoyaltyAccountResponse toResponse(LoyaltyAccount account){
        return LoyaltyAccountResponse.builder()
                .userId(account.getUserId())
                .lifetimePoints(account.getLifetimePoints())
                .tier(account.getTier().name())
                .build();
    }
}
