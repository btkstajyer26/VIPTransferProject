package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.repository.RefreshTokenRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    // Parametrelere IP ve Device bilgisi eklendi
    @Transactional
    public RefreshToken createRefreshToken(Long userId, String ipAddress, String deviceInfo) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı! ID: " + userId));

        // DİKKAT: Artık eski token'ları SİLMİYORUZ! Kullanıcı birden fazla cihazda açık kalabilir.
        // İsteğe bağlı olarak: Sadece süresi dolmuş eski token'ları temizleyen bir metot eklenebilir.

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(OffsetDateTime.now().plusDays(7)) // 7 Gün - OffsetDateTime kullanıldı
                .ipAddress(ipAddress)
                .deviceInfo(deviceInfo)
                .revoked(false)
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token süresi dolmuş. Lütfen tekrar giriş yapın!");
        }
        if (token.isRevoked()) {
            throw new RuntimeException("Bu oturum sonlandırılmış!");
        }
        return token;
    }

    // Logout olduğunda sadece o anki token'ı revoke (iptal) ediyoruz
    @Transactional
    public void revokeToken(RefreshToken token) {
        token.setRevoked(true);
        token.setRevokedAt(OffsetDateTime.now());
        refreshTokenRepository.save(token);
    }
}
