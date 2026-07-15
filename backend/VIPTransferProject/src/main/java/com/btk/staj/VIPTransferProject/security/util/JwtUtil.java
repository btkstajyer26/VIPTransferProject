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

    public String generateToken(String username, Long userId, String role) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Token üretimi için geçerli bir kullanıcı adı gereklidir.");
        }

        return Jwts.builder()
                .setSubject(username)
                .claim("userId", userId)
                .claim("role",role)
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

    // Token içinden rol okuma metodu
    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(keyProvider.getPublicKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}