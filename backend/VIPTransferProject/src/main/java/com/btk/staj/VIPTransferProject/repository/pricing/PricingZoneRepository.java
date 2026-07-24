package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.PricingZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PricingZoneRepository extends JpaRepository<PricingZone, Long>{
    List<PricingZone> findByActiveTrue();

    @Query(value = """
            SELECT * FROM pricing_zones pz
            WHERE pz.is_active = true
              AND ST_Within(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), pz.polygon_geom)
            LIMIT 1
            """, nativeQuery = true)
    Optional<PricingZone> findZoneContainingPoint(@Param("lon") double lon, @Param("lat") double lat);

    @Query(value = """
        SELECT pz.id AS zoneId,
               pz.price_per_km AS pricePerKm,
               ST_Length(
                   ST_Intersection(
                       ST_GeomFromText(:routeWkt, 4326)::geography,
                       pz.polygon_geom::geography
                   )
               ) AS lengthMeters
        FROM pricing_zones pz
        WHERE pz.is_active = true
          AND ST_Intersects(
                  ST_GeomFromText(:routeWkt, 4326)::geography,
                  pz.polygon_geom::geography
              )
        """, nativeQuery = true)
    List<ZoneIntersectionResult> findZoneIntersections(@Param("routeWkt") String routeWkt);

    @Query(value = "SELECT ST_Length(ST_GeomFromText(:routeWkt, 4326)::geography)",
            nativeQuery = true)
    Double calculateTotalRouteLengthMeters(@Param("routeWkt") String routeWkt);

    interface ZoneIntersectionResult {
        Long getZoneId();
        BigDecimal getPricePerKm();
        Double getLengthMeters();
    }
}