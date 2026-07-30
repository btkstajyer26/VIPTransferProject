package com.btk.staj.VIPTransferProject.event;

import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;

public record LoyaltyPointsAccruedEvent(
        Long userId,
        int earnedPoints,
        int lifetimePoints,
        LoyaltyTier previousTier,
        LoyaltyTier newTier
) {
}
