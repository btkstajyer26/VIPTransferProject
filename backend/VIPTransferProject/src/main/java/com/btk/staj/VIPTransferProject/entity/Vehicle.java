package com.btk.staj.VIPTransferProject.entity;

import com.btk.staj.VIPTransferProject.enums.VehicleClass;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plate_number", nullable = false, unique = true, length = 20)
    private String plateNumber;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "vehicle_class", nullable = false, columnDefinition = "vehicle_class")
    private VehicleClass vehicleClass = VehicleClass.STANDARD;

    @Column(length = 50)
    private String brand;

    @Column(length = 50)
    private String model;

    private Short year;

    @Column(length = 30)
    private String color;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(nullable = false)
    private Short capacity;

    @Builder.Default
    @Column(name = "base_price_multiplier", nullable = false, precision = 4, scale = 2)
    private BigDecimal basePriceMultiplier = BigDecimal.ONE;

    @Builder.Default
    @Column(name = "opening_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal openingPrice = BigDecimal.ZERO;

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
