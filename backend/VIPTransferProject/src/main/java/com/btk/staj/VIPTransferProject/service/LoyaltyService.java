package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.loyalty.*;
import com.btk.staj.VIPTransferProject.entity.LoyaltyAccount;
import com.btk.staj.VIPTransferProject.entity.LoyaltyTierConfig;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import com.btk.staj.VIPTransferProject.exception.InvalidTierConfigException;
import com.btk.staj.VIPTransferProject.exception.TierConfigNotFoundException;
import com.btk.staj.VIPTransferProject.exception.UserNotFoundException;
import com.btk.staj.VIPTransferProject.repository.LoyaltyAccountRepository;
import com.btk.staj.VIPTransferProject.repository.LoyaltyTierConfigRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final LoyaltyTierConfigRepository loyaltyTierConfigRepository;
    private final UserRepository userRepository;

    @Transactional
    public void createLoyaltyAccount(Long userId) {
        if (loyaltyAccountRepository.existsById(userId)) {
            return;
        }

        User user = userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        LoyaltyAccount loyaltyAccount = new LoyaltyAccount();
        loyaltyAccount.setTier(LoyaltyTier.BRONZE);
        loyaltyAccount.setLifetimePoints(0);
        loyaltyAccount.setUser(user);
        loyaltyAccountRepository.save(loyaltyAccount);
    }

    public LoyaltyAccountResponse getAccount(Long userId) {
        LoyaltyAccount account = findAccountOrThrow(userId);
        return toResponse(account);
    }

    public LoyaltyDiscountResponse calculateDiscount(Long userId, BigDecimal fareAmount) {
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
    public void AccruePoints(AccruePointsRequests requests) {
        LoyaltyAccount account = findAccountOrThrow(requests.getUserId());
        LoyaltyTierConfig currentConfig = findTierConfigOrThrow(account.getTier());

        int earnedPoints = requests.getFareAmount()
                .multiply(currentConfig.getEarnRate())
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();

        int newLifeTimePoints = account.getLifetimePoints() + earnedPoints;
        account.setLifetimePoints(newLifeTimePoints);

        List<LoyaltyTierConfig> tiersDesc = loyaltyTierConfigRepository.findAllByOrderByMinPointsDesc();
        for (LoyaltyTierConfig tierConfig : tiersDesc) {
            if (newLifeTimePoints >= tierConfig.getMinPoints()) {
                account.setTier(tierConfig.getTier());
                break;
            }
        }

        loyaltyAccountRepository.save(account);
    }

    private LoyaltyAccount findAccountOrThrow(Long userId) {
        return loyaltyAccountRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    private LoyaltyTierConfig findTierConfigOrThrow(LoyaltyTier tier) {
        return loyaltyTierConfigRepository.findByTier(tier)
                .orElseThrow(() -> new TierConfigNotFoundException(tier));
    }

    private LoyaltyAccountResponse toResponse(LoyaltyAccount account) {
        return LoyaltyAccountResponse.builder()
                .userId(account.getUserId())
                .lifetimePoints(account.getLifetimePoints())
                .tier(account.getTier().name())
                .build();
    }

    private void checkTierHierarchy(LoyaltyTier tier, Integer newMinPoints) {
        LoyaltyTier[] order = LoyaltyTier.values();
        int currentIndex = tier.ordinal();

        Integer lowerBound = 0;
        if (currentIndex > 0) {
            LoyaltyTier lowerTier = order[currentIndex - 1];
            lowerBound = loyaltyTierConfigRepository.findByTier(lowerTier)
                    .map(LoyaltyTierConfig::getMinPoints)
                    .orElse(0);
        }

        Integer upperBound = null;
        if (currentIndex < order.length - 1) {
            LoyaltyTier upperTier = order[currentIndex + 1];
            upperBound = loyaltyTierConfigRepository.findByTier(upperTier)
                    .map(LoyaltyTierConfig::getMinPoints)
                    .orElse(null);
        }

        if (newMinPoints.compareTo(lowerBound) <= 0 ||
                (upperBound != null && newMinPoints.compareTo(upperBound) >= 0)) {
            throw new InvalidTierConfigException( tier,lowerBound,upperBound);
        }
    }

    public LoyaltyTierConfig updateTierConfig(LoyaltyTier tier, UpdateTierConfigRequest request) {
        LoyaltyTierConfig config = loyaltyTierConfigRepository.findByTier(tier)
                .orElseThrow(() -> new TierConfigNotFoundException(tier));

        checkTierHierarchy(tier, request.getMinPoints());

        config.setDescription(request.getDescription());
        config.setMinPoints(request.getMinPoints());
        config.setPrioritySupport(request.isPrioritySupport());
        config.setEarnRate(request.getEarnRate());
        config.setDiscountPercentage(request.getDiscountPercentage());

        return loyaltyTierConfigRepository.save(config);

    }
}
