package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.repository.RefreshTokenRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
@Slf4j
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
                .orElseThrow(() ->{
                    // WARN: Veritabanında olmayan bir ID ile token üretilmeye çalışılırsa (Potansiyel anormallik)
                    log.warn("Refresh token üretimi reddedildi: Kullanıcı bulunamadı. Aranan ID: {}, Gelen IP: {}", userId, ipAddress);
                    return new RuntimeException("Kullanıcı bulunamadı! ID: " + userId);
                });

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

        log.info("Yeni oturum (Refresh Token) oluşturuldu. Kullanıcı ID: {}, IP: {}, Cihaz: {}",
                userId, ipAddress, deviceInfo);
        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token,String currentIp,String currentDevice) {
        // 1. İptal Kontrolü
        if (token.isRevoked()) {
            log.warn("İptal edilmiş token kullanımı denemesi! Kullanıcı ID: {}, IP: {}", token.getUser().getId(), currentIp);
            throw new RuntimeException("Bu oturum sonlandırılmış!");
        }

        // 2. Süre Kontrolü
        if (token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            log.info("Süresi dolmuş token temizleniyor. Kullanıcı ID: {}", token.getUser().getId());
            refreshTokenRepository.delete(token);

            throw new RuntimeException("Refresh token süresi dolmuş. Lütfen tekrar giriş yapın!");
        }

        // 3. Token Theft (Hırsızlık) Kontrolü
        boolean isIpMatch = token.getIpAddress().equals(currentIp);
        boolean isDeviceMatch = token.getDeviceInfo().equals(currentDevice);

        if (!isIpMatch || !isDeviceMatch) {
            log.error("TOKEN HIRSIZLIĞI TESPİTİ! Kullanıcı ID: {}. Beklenen IP: {}, Gelen IP: {}. Beklenen Cihaz: {}, Gelen Cihaz: {}",
                    token.getUser().getId(), token.getIpAddress(), currentIp, token.getDeviceInfo(), currentDevice);
            // Şüpheli durum tespit edildi: Token çalınmış! Hemen iptal et.
            revokeToken(token);
            throw new RuntimeException("Güvenlik ihlali tespit edildi! Farklı cihaz/IP erişimi. Tekrar giriş yapın.");
        }
        log.debug("Token bütünlük doğrulaması başarılı. Kullanıcı ID: {}", token.getUser().getId());
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
