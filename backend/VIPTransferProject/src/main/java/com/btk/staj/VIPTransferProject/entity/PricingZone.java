package com.btk.staj.VIPTransferProject.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.locationtech.jts.geom.Polygon;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "pricing_zones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 255)
    private String description;

    // PostGIS GEOMETRY(POLYGON,4326) — JTS Polygon ile eşleniyor (hibernate-spatial)
    @Column(name = "polygon_geom", nullable = false, columnDefinition = "geometry(Polygon,4326)")
    private Polygon polygonGeom;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Builder.Default
    @Column(name = "min_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal minPrice = BigDecimal.ZERO;

    @Column(name = "price_per_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerKm;

    @Builder.Default
    @Column(nullable = false, length = 3)
    private String currency = "TRY";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
