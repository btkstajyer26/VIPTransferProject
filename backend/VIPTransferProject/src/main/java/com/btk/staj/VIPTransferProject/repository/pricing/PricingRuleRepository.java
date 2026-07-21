package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PricingRuleRepository extends JpaRepository<PricingRule, Long> {
    List<PricingRule> findByZoneIdAndActiveTrue(Long zoneId);

    @Query("""
    SELECT pr FROM PricingRule pr
    WHERE pr.zone.id = :zoneId
    AND pr.active = true
    AND (pr.dayOfWeek IS NULL OR pr.dayOfWeek = :dayOfWeek)
    AND pr.startTime <= :time
    AND pr.endTime >= :time
    AND (pr.validFrom IS NULL OR pr.validFrom <= :date)
    AND (pr.validTo IS NULL OR pr.validTo >= :date)
    """)
    List<PricingRule> findActiveRulesForZoneAtMoment(
            @Param("zoneId") Long zoneId,
            @Param("dayOfWeek") Short dayOfWeek,
            @Param("time") LocalTime time,
            @Param("date") LocalDate date
    );
}