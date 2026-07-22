package com.btk.staj.VIPTransferProject.security;

import com.btk.staj.VIPTransferProject.model.User;
import com.btk.staj.VIPTransferProject.repository.RefreshTokenRepository;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Aspect
@Component
public class SecurityAspect {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Before("@annotation(com.btk.staj.VIPTransferProject.security.CheckRevocation)")
    public void validateTokenRevocation() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (principal instanceof User) {
            User user = (User) principal;

            boolean hasActiveToken = refreshTokenRepository.existsByUserAndRevokedFalse(user);

            if (!hasActiveToken) {
                throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, 
                    "Oturumunuz kapatılmıştır, lütfen tekrar giriş yapın."
                );
            }
        } else {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, 
                "Geçersiz veya eksik oturum bilgisi."
            );
        }
    }
}