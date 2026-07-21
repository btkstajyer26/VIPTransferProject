package com.btk.staj.VIPTransferProject.security.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // Her farklı IP için ayrı bir kova (bucket) tutacağımız güvenli bir liste
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // Yeni bir IP adresi için kova kurallarını tanımlayan fonksiyon
    private Bucket createNewBucket() {
        // Kural: Kova kapasitesi 3 jeton olsun ve her 1 dakikada 3 jeton yenilensin.
        return Bucket.builder()
                .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofMinutes(1))))
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Swagger UI, API docs ve actuator isteklerini rate limiting'den muaf tut
        String path = request.getRequestURI();
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || path.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        // İstek atan kullanıcının IP adresini alıyoruz
        String ip = request.getRemoteAddr();

        // Bu IP için listede kova var mı bak, yoksa yeni bir tane oluştur
        Bucket bucket = cache.computeIfAbsent(ip, k -> createNewBucket());

        // Kovadan 1 jeton tüketmeyi dene
        if (bucket.tryConsume(1)) {
            // Jeton varsa isteğin sorunsuzca geçmesine izin ver
            filterChain.doFilter(request, response);
        } else {
            // Jeton bitmişse kapıyı kapat ve HTTP 429 Too Many Requests hatası fırlat
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
        }
    }
}
