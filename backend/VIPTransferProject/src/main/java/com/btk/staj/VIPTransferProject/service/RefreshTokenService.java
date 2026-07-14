package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.model.RefreshToken;
import com.btk.staj.VIPTransferProject.model.User;
import com.btk.staj.VIPTransferProject.repository.RefreshTokenRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository; // Eğer projede UserRepository varsa import etsin, hata verirse bu satırı sileriz
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    // Bizim belirleyeceğimiz refresh token süresi (Milisaniye cinsinden 7 gün)
    private final Long refreshTokenDurationMs = 604800000L; 

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository; // Kullanıcıyı bulmak için gerekebilir

    // Veritabanında token araması yapmak için
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    // Yeni bir Refresh Token oluşturma metodu
    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        RefreshToken refreshToken = new RefreshToken();

        // Projedeki kullanıcıyı bulup token ile bağlıyoruz
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı! ID: " + userId));

        refreshToken.setUser(user);
        // Güvenlik için tahmin edilemez, rastgele çok uzun bir UUID üretiyoruz
        refreshToken.setToken(UUID.randomUUID().toString());
        // Token'ın bitiş süresini şu an + 7 gün olarak ayarlıyoruz
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        refreshToken.setRevoked(false);

        // Önce kullanıcının eski token'ı varsa siliyoruz (Veritabanı şişmesin diye)
        refreshTokenRepository.deleteByUser(user);

        return refreshTokenRepository.save(refreshToken);
    }

    // Token süresi dolmuş mu veya iptal edilmiş mi kontrolü
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token süresi dolmuş. Lütfen tekrar giriş yapın!");
        }
        if (token.isRevoked()) {
            throw new RuntimeException("Bu refresh token iptal edilmiş/geçersiz kılınmış!");
        }
        return token;
    }

    // Kullanıcı logout olduğunda token'ı silmek için
    @Transactional
    public void deleteByUserId(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            refreshTokenRepository.deleteByUser(user);
        }
    }
}