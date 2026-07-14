package com.btk.staj.VIPTransferProject.entity;

import com.btk.staj.VIPTransferProject.enums.ReservationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "reservations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // DB'de fn_generate_booking_ref() ile üretilir; persist sonrası entityManager.refresh() gerekir
    @Column(name = "booking_reference", unique = true, length = 20, insertable = false, updatable = false)
    private String bookingReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "guest_phone", length = 20)
    private String guestPhone;

    @Column(name = "pickup_address", nullable = false, columnDefinition = "TEXT")
    private String pickupAddress;

    // PostGIS GEOGRAPHY(POINT,4326) — JTS Point ile eşleniyor (hibernate-spatial)
    @Column(name = "pickup_point", nullable = false, columnDefinition = "geography(Point,4326)")
    private Point pickupPoint;

    @Column(name = "dropoff_address", nullable = false, columnDefinition = "TEXT")
    private String dropoffAddress;

    @Column(name = "dropoff_point", nullable = false, columnDefinition = "geography(Point,4326)")
    private Point dropoffPoint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_zone_id")
    private PricingZone pickupZone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dropoff_zone_id")
    private PricingZone dropoffZone;

    @Column(name = "scheduled_time", nullable = false)
    private OffsetDateTime scheduledTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Builder.Default
    @Column(name = "passenger_count", nullable = false)
    private short passengerCount = 1;

    @Column(name = "distance_km", precision = 10, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "route_polyline", columnDefinition = "TEXT")
    private String routePolyline;

    // base_price = flag_fee + distance_fee (araç çarpanı ve surge öncesi)
    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Builder.Default
    @Column(name = "surge_multiplier", nullable = false, precision = 4, scale = 2)
    private BigDecimal surgeMultiplier = BigDecimal.ONE;

    @Builder.Default
    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "loyalty_discount", nullable = false, precision = 10, scale = 2)
    private BigDecimal loyaltyDiscount = BigDecimal.ZERO;

    // Rezervasyon anındaki vehicle.openingPrice anlık görüntüsü (denetim)
    @Builder.Default
    @Column(name = "opening_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal openingPrice = BigDecimal.ZERO;

    @Column(name = "calculated_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal calculatedPrice;

    @Builder.Default
    @Column(nullable = false, length = 3)
    private String currency = "TRY";

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, columnDefinition = "reservation_status")
    private ReservationStatus status = ReservationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private Campaign campaign;

    @Column(name = "flight_number", length = 20)
    private String flightNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
