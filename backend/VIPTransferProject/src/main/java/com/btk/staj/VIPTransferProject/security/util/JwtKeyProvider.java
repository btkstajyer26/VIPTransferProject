package com.btk.staj.VIPTransferProject.security.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;

@Slf4j
@Component
public class JwtKeyProvider {

    private PrivateKey privateKey;
    private PublicKey publicKey;

    @PostConstruct
    public void initKeys() {
        log.info("Sistem Güvenliği: RSA Anahtar Çifti (2048-bit) üretimi başlatılıyor...");
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
            keyPairGenerator.initialize(2048);
            KeyPair keyPair = keyPairGenerator.generateKeyPair();

            this.privateKey = keyPair.getPrivate();
            this.publicKey = keyPair.getPublic();

            log.info("Sistem Güvenliği: RSA Anahtar Çifti başarıyla üretildi ve belleğe alındı.");
        } catch (NoSuchAlgorithmException e) {
            log.error("KRİTİK HATA: Sistemde RSA algoritması bulunamadı. Güvenlik zafiyeti riski nedeniyle başlatma durduruluyor!", e);
            throw new IllegalStateException("Güvenli anahtar üretilemedi, uygulama başlatılamaz.", e);
        } finally {}
    }

    public PrivateKey getPrivateKey() {
        return privateKey;
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }
}