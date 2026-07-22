package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    // 1. TEMEL SORGULAMA
    Optional<RefreshToken> findByToken(String token);

    // 2. Kullanıcının tüm oturum geçmişini (hangi cihazlardan girmiş) SOC ekranında görmek için
    List<RefreshToken> findAllByUser(User user);

    // 3. Kullanıcının sadece aktif olan (çıkış yapmadığı) cihazlarını listelemek için
    List<RefreshToken> findAllByUserAndRevokedFalse(User user);

    // 4. Artık normal çıkışlarda kullanılmaz
    // Sadece "Tüm Cihazlardan Çıkış Yap" butonuna basıldığında veya kullanıcı sistemden tamamen silindiğinde kullanılır.
    void deleteByUser(User user);

    Optional<RefreshToken> findByUserAndDeviceInfo(User user, String deviceInfo);
    
    // Eski silme metodu (opsiyonel kalabilir)
    void deleteByUser(User user);

    // --- YENİ EKLENEN METOTLAR ---

    // 1. Kullanıcı logout olduğunda token'ını silmek yerine revoked = true yapıyoruz
    @Transactional
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.user = :user AND r.revoked = false")
    void revokeTokensByUser(@Param("user") User user);

    // 2. Kritik endpoint'lerde kullanıcının aktif (revoked = false) token'ı var mı kontrol etmek için
    boolean existsByUserAndRevokedFalse(User user);
}