package com.btk.staj.VIPTransferProject.entity;

import com.btk.staj.VIPTransferProject.enums.LoyaltyTier;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "loyalty_tier_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyTierConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, columnDefinition = "loyalty_tier")
    private LoyaltyTier tier;

    @Column(name = "min_points", nullable = false)
    private int minPoints;

    // Rezervasyon başına TL başına kazanılan puan oranı
    @Builder.Default
    @Column(name = "earn_rate", nullable = false, precision = 6, scale = 2)
    private BigDecimal earnRate = BigDecimal.ONE;

    @Builder.Default
    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "priority_support", nullable = false)
    private boolean prioritySupport = false;

    @Column(length = 255)
    private String description;
}
