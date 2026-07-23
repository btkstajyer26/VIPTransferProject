package com.btk.staj.VIPTransferProject.security.filter;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // FarklÄ± uÃ§ noktalar iÃ§in IP bazlÄ± ayrÄ± kovalar tutuyoruz
    private final Map<String, Bucket> loginCache = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalCache = new ConcurrentHashMap<>();

    // Nesneleri JSON'a Ã§evirmek iÃ§in Jackson ObjectMapper
    private final ObjectMapper objectMapper;

    public RateLimitingFilter() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule()); // OffsetDateTime dÃ¶nÃ¼ÅŸÃ¼mÃ¼ iÃ§in gerekli
    }

    // Login (Auth) iÃ§in kural: Dakikada maksimum 5 istek (Brute-force'u engeller)
    private Bucket createLoginBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build();
    }

    // Genel API istekleri iÃ§in kural: Dakikada maksimum 100 istek
    private Bucket createGeneralBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Muaf tutulan yollar
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || path.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Ä°stek atan kullanÄ±cÄ±nÄ±n IP adresini alÄ±yoruz
        // Not: Docker veya Nginx kullanÄ±yorsan "X-Forwarded-For" header'Ä±na bakmak daha gÃ¼venilir olabilir.
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }

        Bucket bucket;
        // Ä°stek Auth iÅŸlemi mi (Login, Refresh, Logout) yoksa genel bir veri isteÄŸi mi?
        if (path.startsWith("/api/auth/")) {
            bucket = loginCache.computeIfAbsent(ip, k -> createLoginBucket());
        } else {
            bucket = generalCache.computeIfAbsent(ip, k -> createGeneralBucket());
        }

        // Kovadan 1 jeton tÃ¼ketmeyi dene
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            // GÃœVENLÄ°K LOGU: IP adresi spam yapÄ±yor
            log.warn("RATE LIMIT AÅILDI! IP: {}, Path: {}", ip, path);

            // Standart ApiResponse formatÄ±nda hata dÃ¶nÃ¼ÅŸÃ¼
            ApiResponse<String> apiResponse = ApiResponse.<String>builder()
                    .status(429)
                    .message("Ã‡ok fazla istek attÄ±nÄ±z. LÃ¼tfen bir sÃ¼re bekleyip tekrar deneyin.")
                    .timestamp(OffsetDateTime.now())
                    .build();

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        }
    }
}