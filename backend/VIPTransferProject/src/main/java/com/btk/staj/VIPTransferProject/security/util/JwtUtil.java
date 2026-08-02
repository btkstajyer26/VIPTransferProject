package com.btk.staj.VIPTransferProject.security.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Date;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final JwtKeyProvider keyProvider;
    private static final long EXPIRATION_TIME = 1000 * 60 * 15; // 15dk Access Token

    public String generateToken(Long userId,Long sessionId) {
        if (userId == null || sessionId == null) {
            throw new IllegalArgumentException("Token üretimi için geçerli bir Kullanıcı ID ve Session ID gereklidir.");
        }

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("sessionId",sessionId)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(keyProvider.getPrivateKey(), SignatureAlgorithm.RS256)
                .compact();
    }

    // Token Doğrulama (Security/Filtre katmanında her istekte çağrılır)
    public boolean validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            log.warn("Güvenlik Uyarısı: Boş veya null token ile işlem yapılmaya çalışıldı.");
            return false;
        }

        try {
            Jwts.parserBuilder()
                    .setSigningKey(keyProvider.getPublicKey()) // Sadece Public Key ile imza kontrolü
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (SignatureException e) {
            log.error("Siber Güvenlik İhlali: Token imzası geçersiz! Manipülasyon girişimi olabilir. Token: {}", token);
        } catch (ExpiredJwtException e) {
            log.info("Oturum Süresi Doldu: Kullanıcının token süresi bitmiş. Token: {}", token);
        } catch (MalformedJwtException e) {
            log.warn("Bozuk Yapı: JWT formatına uymayan bir string gönderildi. Token: {}", token);
        } catch (Exception e) {
            log.error("Bilinmeyen Token Hatası: {}", e.getMessage());
        }
        return false;
    }
    public Long extractUserId(String token) {
        Number userId = extractAllClaims(token).get("userId", Number.class);
        return userId != null ? userId.longValue() : null;
    }
    public Long extractSessionId(String token) {
        Number sessionId = extractAllClaims(token).get("sessionId", Number.class);
        return sessionId != null ? sessionId.longValue() : null; }
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(keyProvider.getPublicKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}