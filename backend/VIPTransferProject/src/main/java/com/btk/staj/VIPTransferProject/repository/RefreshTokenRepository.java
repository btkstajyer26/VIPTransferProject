package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.model.RefreshToken;
import com.btk.staj.VIPTransferProject.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    
    // Veritabanında bu token kayıtlı mı diye bakmak için
    Optional<RefreshToken> findByToken(String token);
    
    // Kullanıcı çıkış yaptığında (logout) veritabanındaki refresh token'ını silmek için
    void deleteByUser(User user);
}