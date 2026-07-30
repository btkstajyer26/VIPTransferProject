package com.btk.staj.VIPTransferProject.security.filter;

import com.btk.staj.VIPTransferProject.dto.ApiResponse;
import com.btk.staj.VIPTransferProject.exception.UnauthorizedException;
import com.btk.staj.VIPTransferProject.security.util.IpUtil;
import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.RefreshTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    //private final ObjectMapper objectMapper;
    private final RefreshTokenService refreshTokenService;
    private final HandlerExceptionResolver handlerExceptionResolver;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String currentDeviceInfo = request.getHeader("User-Agent");
        final String currentIp = IpUtil.getClientIp(request);
        final String jwt;
        final String phoneNumber;
        final String role;
        final Long userId;
        final Long sessionId;
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        //Token'ı temizle ("Bearer " kelimesinden sonrası alınacak)
        jwt = authHeader.substring(7);

        try {
            //Token'ın imzasını ve süresini JwtUtil ile doğrulanıyor
            if (jwtUtil.validateToken(jwt)) {
                role= jwtUtil.extractRole(jwt);
                phoneNumber = jwtUtil.extractUsername(jwt);
                userId= jwtUtil.extractUserId(jwt);
                sessionId= jwtUtil.extractSessionId(jwt);
                log.info("[SOC-MONITOR] İstek onaylanıyor -> IP: {}, User-Agent: {}, User: {}", currentIp, currentDeviceInfo, phoneNumber);

                if(sessionId!=null){
                    refreshTokenService.validateSessionIntegrity(sessionId,currentDeviceInfo,currentIp);
                }

                if (phoneNumber != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    String authority = role.startsWith("ROLE_") ? role : "ROLE_" + role;
                    List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(authority));
                    log.debug("[JwtFilter] SecurityContext'e atanacak Yetki (Authority): UserId:{} , phoneNumber: {} , sessionId:{} ", userId,phoneNumber,sessionId);
                    // GÜVENLİK ONAYLANDI
                    UserPrincipal principal = new UserPrincipal(userId,phoneNumber,sessionId);
                    log.debug("[JwtFilter] SecurityContext'e atanacak kimlik: {}", authority);
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            principal, null, authorities
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    log.debug("İç Gateway (Filtre): İstek onaylandı, kullanıcı: {}", phoneNumber);
                }
            }
        }
        catch (Exception e) {
            log.error("[AUTH-401] [JwtFilter] Kimlik doğrulama başarısız (Geçersiz Token): {}", e.getMessage());
            // Eğer fırlatılan hata zaten bizim UnauthorizedException ise (örn. Hijacking) olduğu gibi al,
            // değilse (örn. süresi dolmuş veya imzası bozuk token) standart mesajla yeni bir hata fırlat.
            UnauthorizedException resolvedException = (e instanceof UnauthorizedException)
                    ? (UnauthorizedException) e
                    : new UnauthorizedException("Oturum süreniz dolmuş veya geçersiz token. Lütfen tekrar giriş yapın.");

            // Hatayı GlobalExceptionHandler'a pasla ve döngüyü kır
            handlerExceptionResolver.resolveException(request, response, null, resolvedException);
            return;
        }
        filterChain.doFilter(request, response);
    }
}