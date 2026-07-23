package com.btk.staj.VIPTransferProject.exception;

import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;

public class InvalidTierConfigException extends RuntimeException {
    public InvalidTierConfigException(
            LoyaltyTier tier,
            Integer lowerBound,
            Integer upperBound
    )
    {
        super(tier + " min puanı " + lowerBound + " ile " +
                (upperBound != null ? upperBound.toString() : "sınırsız") + " arasında olmalı");
    }
}
