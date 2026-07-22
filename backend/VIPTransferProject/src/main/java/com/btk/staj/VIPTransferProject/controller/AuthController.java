package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.model.RefreshToken;
import com.btk.staj.VIPTransferProject.repository.RefreshTokenRepository;
import com.btk.staj.VIPTransferProject.service.RefreshTokenService;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtUtil jwtUtil;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    private String generateDummyAccessToken(String username) {
        return "yeni_uretilmis_kisa_sureli_access_token_jwt_" + username;
    }

    // 2. YENİ ACCESS TOKEN ALMA (frontend'den gelen Request'teki Refresh Token okunarak yapılır)
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAccessToken(HttpServletRequest request, HttpServletResponse response) {
        String requestRefreshToken = null;
        
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    requestRefreshToken = cookie.getValue();
                    break;
                }
            }
        }

        // İsteği yapanın anlık bilgilerini alıyoruz
        String currentIpAddress = httpRequest.getRemoteAddr();
        String currentDeviceInfo = httpRequest.getHeader("User-Agent");

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String newAccessToken = generateDummyAccessToken(user.getEmail());
                    
                    Map<String, String> responseBody = new HashMap<>();
                    responseBody.put("accessToken", newAccessToken);
                    responseBody.put("tokenType", "Bearer");

                    return ResponseEntity.ok(AuthResponse.builder()
                            .accessToken(newAccessToken)
                            .refreshToken(refreshTokenRequest) // Aynı refresh token ile devam ediliyor
                            .tokenType("Bearer")
                            .userId(user.getId())
                            .build());
                })
                .orElseThrow(() -> new RuntimeException("Refresh token sistemde bulunamadı!"));
    }

    // 2. GÜVENLİ ÇIKIŞ (LOGOUT) ENDPOINT'İ
    @PostMapping("/logout")
    public ResponseEntity<String> logoutUser(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        String refreshTokenRequest = refreshRequest.getRefreshToken();

        // Token veritabanında varsa bul ve 'revoked' (iptal) durumuna çek
        refreshTokenService.findByToken(refreshTokenRequest)
                .ifPresent(refreshTokenService::revokeToken);

        return ResponseEntity.ok("Başarıyla çıkış yapıldı.");
        // Token DB'de varsa silmek yerine revoked = true yapıyoruz
        if (requestRefreshToken != null) {
            refreshTokenService.findByToken(requestRefreshToken)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
        }

        // Tarayıcıdaki HttpOnly çerezini sıfırlıyoruz
        Cookie cookie = new Cookie("refreshToken", null);
        cookie.setPath("/api/auth");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok("Başarıyla çıkış yapıldı ve token'lar iptal edildi!");
    }
}