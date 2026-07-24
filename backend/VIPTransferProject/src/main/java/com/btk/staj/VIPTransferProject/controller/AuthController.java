package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import com.btk.staj.VIPTransferProject.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.dto.RefreshTokenRequest;
import com.btk.staj.VIPTransferProject.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.btk.staj.VIPTransferProject.dto.RegisterRequestDto;
import com.btk.staj.VIPTransferProject.dto.RegisterResponseDto;

import java.time.OffsetDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        String deviceInfo = httpRequest.getHeader("User-Agent");

        AuthResponse authResponse = authService.login(request, ipAddress, deviceInfo);

        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Giriş başarılı.")
                .data(authResponse)
                .timestamp(OffsetDateTime.now())
                .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshAccessToken(@Valid @RequestBody RefreshTokenRequest refreshRequest, HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        String deviceInfo = httpRequest.getHeader("User-Agent");

        AuthResponse authResponse = authService.refreshAccessToken(refreshRequest.getRefreshToken(), ipAddress, deviceInfo);

        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Token başarıyla yenilendi.")
                .data(authResponse)
                .timestamp(OffsetDateTime.now())
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logoutUser(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        authService.logout(refreshRequest.getRefreshToken());

        return ResponseEntity.ok(ApiResponse.<String>builder()
                .status(HttpStatus.OK.value())
                .message("Başarıyla çıkış yapıldı.")
                .timestamp(OffsetDateTime.now())
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponseDto> register(@Valid @RequestBody RegisterRequestDto request) {
        // AuthService doğrudan RegisterResponseDto nesnesini oluşturup dönmelidir.
        RegisterResponseDto response = authService.register(request);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(@RequestParam("token") String token) {
        // AuthService'in mesaj döndüğünü varsayıyoruz.
        // Eğer void dönüyorsa "E-posta başarıyla doğrulandı." şeklinde statik bir string de geçebilirsin.
        String message = authService.verifyEmail(token);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", message
                )
        );
    }
}