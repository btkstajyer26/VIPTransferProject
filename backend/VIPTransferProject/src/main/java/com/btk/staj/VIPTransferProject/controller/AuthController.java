package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.model.RefreshToken;
import com.btk.staj.VIPTransferProject.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private RefreshTokenService refreshTokenService;

    // Kanka buraya sizin mevcut JWT üretme servisiniz gelecek (Örn: JwtUtils veya JwtService)
    // Şimdilik simüle etmek için dummy bir metot gibi düşünebilirsin.
    private String generateDummyAccessToken(String username) {
        return "yeni_uretilmis_kisa_sureli_access_token_jwt_" + username;
    }

    // 1. REFRESH TOKEN İLE YENİ ACCESS TOKEN ALMA ENDPOINT'İ
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAccessToken(HttpServletRequest request, HttpServletResponse response) {
        String requestRefreshToken = null;
        
        // Tarayıcıdan gelen HttpOnly çerezlerin (cookies) içinden refresh token'ı buluyoruz
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    requestRefreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (requestRefreshToken == null || requestRefreshToken.isEmpty()) {
            return ResponseEntity.badRequest().body("Refresh Token bulunamadı! Lütfen tekrar giriş yapın.");
        }

        // Token'ı veritabanında arat, süresini ve iptal durumunu doğrula
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    // Kullanıcı doğrulandı, yeni kısa süreli Access Token üretiyoruz
                    String newAccessToken = generateDummyAccessToken(user.getEmail()); // ya da user.getUsername()
                    
                    Map<String, String> responseBody = new HashMap<>();
                    responseBody.put("accessToken", newAccessToken);
                    responseBody.put("tokenType", "Bearer");

                    return ResponseEntity.ok(responseBody);
                })
                .orElseThrow(() -> new RuntimeException("Refresh token veritabanında kayıtlı değil!"));
    }

    // 2. GÜVENLİ ÇIKIŞ (LOGOUT) ENDPOINT'İ (Çerezi temizler ve DB'den siler)
    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(HttpServletRequest request, HttpServletResponse response) {
        String requestRefreshToken = null;
        
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    requestRefreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (requestRefreshToken != null) {
            refreshTokenService.findByToken(requestRefreshToken)
                .ifPresent(token -> refreshTokenService.deleteByUserId(token.getUser().getId()));
        }

        // Tarayıcıdaki HttpOnly çerezini sıfırlıyoruz (Siliyoruz)
        Cookie cookie = new Cookie("refreshToken", null);
        cookie.setPath("/api/auth");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0); // 0 saniye yaparak anında silinmesini sağladık
        response.addCookie(cookie);

        return ResponseEntity.ok("Başarıyla çıkış yapıldı ve token'lar temizlendi!");
    }
}