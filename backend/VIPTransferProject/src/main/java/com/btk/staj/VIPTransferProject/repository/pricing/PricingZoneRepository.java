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
            ORDER BY ST_Area(pz.polygon_geom) ASC
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

    // Yeni bölgeyi mevcut aktif bölgelerin birleşiminden çıkararak çakışmayan alanın WKT'sini döndürür.
    // excludeId: güncelleme sırasında kendi bölgesini dışlamak için kullanılır; oluşturmada null gönderilir.
    // Hiçbir aktif bölge yoksa ST_Union NULL döner; COALESCE ile boş geometri fallback verilir,
    // böylece ST_Difference orijinal polygonu değişmeden geri verir.
    @Query(value = """
            SELECT ST_AsText(
                ST_Difference(
                    ST_SetSRID(ST_GeomFromText(:polygonWkt), 4326),
                    COALESCE(
                        (SELECT ST_Union(pz.polygon_geom)
                         FROM pricing_zones pz
                         WHERE pz.is_active = true
                           AND (:excludeId IS NULL OR pz.id != :excludeId)),
                        ST_GeomFromText('GEOMETRYCOLLECTION EMPTY', 4326)
                    )
                )
            )
            """, nativeQuery = true)
    Optional<String> computeNonOverlappingAreaWkt(@Param("polygonWkt") String polygonWkt,
                                                   @Param("excludeId") Long excludeId);

    interface ZoneIntersectionResult {
        Long getZoneId();
        BigDecimal getPricePerKm();
        Double getLengthMeters();
    }
}