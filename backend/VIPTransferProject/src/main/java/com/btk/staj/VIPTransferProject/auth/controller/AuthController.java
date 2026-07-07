package com.btk.staj.VIPTransferProject.auth.controller;

import com.btk.staj.VIPTransferProject.auth.dto.AuthResponse;
import com.btk.staj.VIPTransferProject.auth.dto.LoginRequest;
import com.btk.staj.VIPTransferProject.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        log.info("HTTP POST /api/v1/auth/login isteği alindi.");
        return ResponseEntity.ok(authService.login(request));
    }
}