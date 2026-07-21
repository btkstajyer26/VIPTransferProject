package com.btk.staj.VIPTransferProject.security.config;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    // 2. İş Mantığı ve Güvenlik Hataları (Senin fırlattığın RuntimeException'lar)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<String>> handleRuntimeException(RuntimeException ex) {

        // Loglama: Token hırsızlığı, süresi dolmuş token veya iptal edilmiş oturum logu
        log.warn("İş Mantığı / Güvenlik Reddedildi (401): {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.<String>builder()
                        .status(401)
                        .message(ex.getMessage())
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