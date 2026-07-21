package com.btk.staj.VIPTransferProject.entity;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "user_notification_preferences",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "channel"}),
        check = @CheckConstraint(constraint = "channel IN ('WHATSAPP', 'PUSH')")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(
            nullable = false,
            columnDefinition = "notification_channel"
    )
    private NotificationChannel channel;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean enabled = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
