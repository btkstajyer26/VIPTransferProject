package com.btk.staj.VIPTransferProject.controller;

import com.btk.staj.VIPTransferProject.dto.UpdateUserRequest;
import com.btk.staj.VIPTransferProject.dto.UserResponse;
import com.btk.staj.VIPTransferProject.security.util.UserPrincipal;
import com.btk.staj.VIPTransferProject.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /*
     * Giriş yapan kullanıcının kendi profilini getirir.
     * Kullanıcı ID'si URL'den değil JWT token'dan alınır.
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                userService.getCurrentUser(principal.id())
        );
    }

    /*
     * Giriş yapan kullanıcının kendi profilini günceller.
     * Başka bir kullanıcıya ait ID gönderilemez.
     */
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateUserRequest request) {

        return ResponseEntity.ok(
                userService.updateCurrentUser(principal.id(), request)
        );
    }

    /*
     * Giriş yapan kullanıcının kendi hesabını pasif hâle getirir.
     */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {

        userService.deleteCurrentUser(principal.id());

        return ResponseEntity.noContent().build();
    }

    /*
     * Tüm aktif kullanıcıları yalnızca ADMIN görüntüleyebilir.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /*
     * ID ile kullanıcı görüntüleme yalnızca ADMIN işlemidir.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(
            @PathVariable Long id) {

        return ResponseEntity.ok(userService.getUserById(id));
    }
}