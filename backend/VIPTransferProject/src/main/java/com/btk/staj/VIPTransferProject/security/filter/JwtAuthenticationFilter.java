package com.btk.staj.VIPTransferProject.security.filter;

import com.btk.staj.VIPTransferProject.security.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        //Token'ı temizle ("Bearer " kelimesinden sonrası alınacak)
        jwt = authHeader.substring(7);

        try {
            //Token'ın imzasını ve süresini JwtUtil ile doğrulanıyor
            if (jwtUtil.validateToken(jwt)) {

                username = jwtUtil.extractUsername(jwt);
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                    // GÜVENLİK ONAYLANDI
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username, null, new ArrayList<>() // Şu an yetkileri (Role) boş geçiyoruz
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    log.debug("İç Gateway (Filtre): İstek onaylandı, kullanıcı: {}", username);
                }
            }
        } catch (Exception e) {
            log.error("İç Gateway Uyarısı: Token işlenirken hata oluştu: {}", e.getMessage());
        }
        filterChain.doFilter(request, response);
    }
}