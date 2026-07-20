package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;

public class TierConfigNotFoundException extends RuntimeException {
    public TierConfigNotFoundException(LoyaltyTier tier ) {
        super("Loyalty Tier -" + tier + "- not found");
    }
}
