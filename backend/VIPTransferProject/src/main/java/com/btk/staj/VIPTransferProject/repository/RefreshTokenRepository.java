package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.RefreshToken;
import com.btk.staj.VIPTransferProject.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    // 1. TEMEL SORGULAMA (Değişmedi - Her işlemde token'ı bulmak için kullanılır)
    Optional<RefreshToken> findByToken(String token);

    // 2. YENİ: Kullanıcının tüm oturum geçmişini (hangi cihazlardan girmiş) SOC ekranında görmek için
    List<RefreshToken> findAllByUser(User user);

    // 3. YENİ: Kullanıcının SADECE aktif olan (çıkış yapmadığı) cihazlarını listelemek için
    List<RefreshToken> findAllByUserAndRevokedFalse(User user);

    // 4. NÜKLEER SEÇENEK: Artık normal çıkışlarda kullanılmaz!
    // Sadece "Tüm Cihazlardan Çıkış Yap" butonuna basıldığında veya kullanıcı sistemden tamamen silindiğinde kullanılır.
    void deleteByUser(User user);
}