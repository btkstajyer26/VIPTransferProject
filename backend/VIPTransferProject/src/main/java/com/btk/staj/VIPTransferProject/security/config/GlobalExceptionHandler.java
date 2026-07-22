package com.btk.staj.VIPTransferProject.security.config;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1. Validasyon Hataları (Örn: @NotBlank)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<String>> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();

        // Loglama: İsteğin formatı yanlış geldiğinde uyarı veriyoruz
        log.warn("İstek Validasyon Hatası (400): {}", message);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<String>builder()
                        .status(400)
                        .message(message)
                        .timestamp(OffsetDateTime.now())
                        .build());
    }
// İŞ MANTIĞI HATALARI: Servislerden fırlatılan genel RuntimeException'lar (400)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<String>> handleRuntimeException(RuntimeException ex) {

        // Güvenlik hatalarını (401) artık filtreler yönettiği için, buraya sadece iş kuralları düşer.
        log.warn("İş Kuralı İhlali (400): {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<String>builder()
                        .status(400)
                        .message(ex.getMessage()) // "Araç bulunamadı", "Tarih geçmiş" vb.
                        .timestamp(OffsetDateTime.now())
                        .build());
    }

    //  YETKİ YETERSİZLİĞİ: Controller'daki @PreAuthorize patlamaları (403)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<String>> handleAccessDeniedException(AccessDeniedException ex) {

        log.warn("Erişim Reddedildi (403) - Metot Kalkanı: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.<String>builder()
                        .status(403)
                        .message("Bu işlemi gerçekleştirmek için yeterli yetkiniz bulunmuyor.")
                        .timestamp(OffsetDateTime.now())
                        .build());
    }

    // 3. Beklenmeyen Sistem Hataları (Veritabanı çökmesi, NullPointerException vb.)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<String>> handleGlobalException(Exception ex) {

        // Loglama: Burada hatanın tüm stack trace'ini (detayını) logluyoruz ki sorunu çözebilelim
        log.error("Beklenmeyen Sistem Hatası (500): ", ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<String>builder()
                        .status(500)
                        .message("Sistemde geçici bir hata oluştu, lütfen daha sonra tekrar deneyin.")
                        .timestamp(OffsetDateTime.now())
                        .build());
    }
}