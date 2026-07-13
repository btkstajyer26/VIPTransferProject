package com.btk.staj.VIPTransferProject.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(
    name = "entity_translations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"entity_type", "entity_id", "field_name", "lang_code"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntityTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Geçerli değerler: pricing_zone | campaign | pricing_rule | loyalty_tier | vehicle
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    // İlgili tablonun id değeri (polimorfik mantıksal FK)
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    // Hangi alan çeviriliyor; ör: "name", "description", "reason"
    @Column(name = "field_name", nullable = false, length = 50)
    private String fieldName;

    @Column(name = "lang_code", nullable = false, length = 5)
    private String langCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String value;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
