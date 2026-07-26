package com.btk.staj.VIPTransferProject.entity;

import com.btk.staj.VIPTransferProject.enums.CodePurpose;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "verification_codes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "purpose"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 6)
    private String code;                   // 6 haneli OTP

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CodePurpose purpose;           // EMAIL_VERIFICATION | PASSWORD_RESET

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    @Builder.Default
    @Column(nullable = false)
    private int attemptCount = 0;          // Yanlış deneme sayacı (brute-force koruması)
}