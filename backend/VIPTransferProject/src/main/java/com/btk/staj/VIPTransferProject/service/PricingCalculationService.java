package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.pricing.PriceBreakdownResponseDto;
import com.btk.staj.VIPTransferProject.entity.*;
import com.btk.staj.VIPTransferProject.enums.DiscountType;
import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import com.btk.staj.VIPTransferProject.exception.InvalidPricingRuleException;
import com.btk.staj.VIPTransferProject.repository.LoyaltyAccountRepository;
import com.btk.staj.VIPTransferProject.repository.LoyaltyTierConfigRepository;
import com.btk.staj.VIPTransferProject.repository.ReservationRepository;
import com.btk.staj.VIPTransferProject.repository.pricing.PricingRuleRepository;
import com.btk.staj.VIPTransferProject.repository.pricing.PricingZoneRepository;
import com.btk.staj.VIPTransferProject.util.PolylineDecoder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)

public class PricingCalculationService{
    private final PricingZoneRepository pricingZoneRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final ReservationRepository reservationRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final LoyaltyTierConfigRepository loyaltyTierConfigRepository;

    public PriceBreakdownResponseDto calculatePrice(Reservation reservation){
        PricingZone pickupZone = reservation.getPickupZone();
        if (pickupZone == null) {
            throw new InvalidPricingRuleException(
                    "Başlangıç noktası hizmet bölgesi dışında. "
                            + "Bu konumdan rezervasyon oluşturulamaz.");
        }

        Vehicle vehicle = reservation.getVehicle();

        String routeWkt= PolylineDecoder.decodeToWkt(reservation.getRoutePolyline());
        List<PricingZoneRepository.ZoneIntersectionResult> intersections = pricingZoneRepository.findZoneIntersections(routeWkt);
        Double totalRouteLengthMeters = pricingZoneRepository.calculateTotalRouteLengthMeters(routeWkt);
        BigDecimal distanceFee = calculateDistanceFee(intersections, totalRouteLengthMeters, pickupZone.getPricePerKm());

        BigDecimal flagFee = calculateFlagFee(pickupZone, vehicle);
        BigDecimal basePrice = flagFee.add(distanceFee);

        BigDecimal vehicleAdjusted = basePrice.multiply(vehicle.getBasePriceMultiplier());

        BigDecimal surgeMultiplier = findSurgeMultiplier(pickupZone,reservation.getScheduledTime());
        BigDecimal afterSurge = vehicleAdjusted.multiply(surgeMultiplier);

        BigDecimal campaignDiscount = calculateCampaignDiscount(
                reservation.getCampaign(), reservation.getUser(), afterSurge);
        BigDecimal loyaltyDiscount = calculateLoyaltyDiscount(reservation.getUser(), afterSurge);

        BigDecimal finalPrice = calculateFinalPrice(afterSurge,campaignDiscount,loyaltyDiscount,pickupZone.getMinPrice());

        return PriceBreakdownResponseDto.builder()
                .distanceFee(distanceFee)
                .flagFee(flagFee)
                .basePrice(basePrice)
                .vehicleAdjustedPrice(vehicleAdjusted)
                .surgeMultiplier(surgeMultiplier)
                .priceAfterSurge(afterSurge)
                .campaignDiscount(campaignDiscount)
                .loyaltyDiscount(loyaltyDiscount)
                .finalPrice(finalPrice)
                .currency(pickupZone.getCurrency())
                .build();

    }

    private BigDecimal calculateDistanceFee(List<PricingZoneRepository.ZoneIntersectionResult> intersections,
                                            Double totalRouteLengthMeters,
                                            BigDecimal pickupZonePricePerKm) {
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal coveredMeters = BigDecimal.ZERO;

        for (PricingZoneRepository.ZoneIntersectionResult result : intersections) {
            BigDecimal lengthKm = BigDecimal.valueOf(result.getLengthMeters())
                    .divide(BigDecimal.valueOf(1000), 6, RoundingMode.HALF_UP);
            total = total.add(lengthKm.multiply(result.getPricePerKm()));
            coveredMeters = coveredMeters.add(BigDecimal.valueOf(result.getLengthMeters()));
        }

        // Rotanın hiçbir zone'a girmeyen kısmı — pickup zone'un fiyatıyla ücretlendiriliyor (varsayılan)
        BigDecimal uncoveredMeters = BigDecimal.valueOf(totalRouteLengthMeters).subtract(coveredMeters);
        if (uncoveredMeters.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal uncoveredKm = uncoveredMeters.divide(BigDecimal.valueOf(1000), 6, RoundingMode.HALF_UP);
            total = total.add(uncoveredKm.multiply(pickupZonePricePerKm));
        }

        return total;
    }

    private BigDecimal calculateFlagFee(PricingZone pickupZone, Vehicle vehicle){
        return pickupZone.getBasePrice().add(vehicle.getOpeningPrice());
    }

    private BigDecimal findSurgeMultiplier(PricingZone zone, OffsetDateTime scheduledTime) {
        LocalDate date = scheduledTime.toLocalDate();
        LocalTime time = scheduledTime.toLocalTime();
        short dayOfWeek = (short) (scheduledTime.getDayOfWeek().getValue() % 7);

        List<PricingRule> activeRules = pricingRuleRepository.findActiveRulesForZoneAtMoment(
                zone.getId(), dayOfWeek, time, date);

        return activeRules.stream()
                .map(PricingRule::getMultiplier)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
    }

    private BigDecimal calculateCampaignDiscount(Campaign campaign, User user, BigDecimal amount) {
        if (campaign == null) {
            return BigDecimal.ZERO;
        }

        validateCampaignEligibility(campaign, user, amount);

        BigDecimal discount;
        if (campaign.getDiscountType() == DiscountType.PERCENTAGE) {
            discount = amount.multiply(campaign.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discount = campaign.getDiscountValue();
        }

        if (campaign.getMaxDiscountAmount() != null
                && discount.compareTo(campaign.getMaxDiscountAmount()) > 0) {
            discount = campaign.getMaxDiscountAmount();
        }

        return discount;
    }

    private void validateCampaignEligibility(Campaign campaign, User user, BigDecimal amount) {
        OffsetDateTime now = OffsetDateTime.now();

        if (!campaign.isActive()) {
            throw new InvalidPricingRuleException("Kampanya aktif değil: " + campaign.getCode());
        }
        if (now.isBefore(campaign.getValidFrom()) || now.isAfter(campaign.getValidTo())) {
            throw new InvalidPricingRuleException("Kampanyanın geçerlilik süresi dışındasınız: " + campaign.getCode());
        }
        if (amount.compareTo(campaign.getMinOrderAmount()) < 0) {
            throw new InvalidPricingRuleException(
                    "Kampanya için minimum tutar sağlanmıyor (min=" + campaign.getMinOrderAmount() + ")");
        }
        if (campaign.getMaxUses() != null && campaign.getUsedCount() >= campaign.getMaxUses()) {
            throw new InvalidPricingRuleException("Kampanyanın toplam kullanım limiti dolmuş: " + campaign.getCode());
        }
        if (user != null) {
            long usedByUser = reservationRepository.countByUserIdAndCampaignIdAndStatusNot(
                    user.getId(), campaign.getId(), ReservationStatus.CANCELLED);
            if (usedByUser >= campaign.getMaxUsesPerUser()) {
                throw new InvalidPricingRuleException("Bu kampanyayı kullanım limitinize ulaştınız: " + campaign.getCode());
            }
        }
    }

    private BigDecimal calculateLoyaltyDiscount(User user, BigDecimal amount) {
        if (user == null) {
            return BigDecimal.ZERO; // misafir kullanıcı sadakat indirimi alamaz
        }

        return loyaltyAccountRepository.findById(user.getId())
                .flatMap(account -> loyaltyTierConfigRepository.findByTier(account.getTier()))
                .map(config -> amount.multiply(config.getDiscountPercentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP))
                .orElse(BigDecimal.ZERO);
    }

    // ---final fiyat ---
    private BigDecimal calculateFinalPrice(BigDecimal amountBeforeDiscount, BigDecimal campaignDiscount,
                                           BigDecimal loyaltyDiscount, BigDecimal minPrice) {
        BigDecimal net = amountBeforeDiscount.subtract(campaignDiscount).subtract(loyaltyDiscount);
        return net.max(minPrice);
    }

}