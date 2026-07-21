package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserDeviceTokenRepository
        extends JpaRepository<UserDeviceToken, Long> {

    List<UserDeviceToken> findAllByUserIdAndActiveTrue(Long userId);

    Optional<UserDeviceToken> findByToken(String token);

    boolean existsByToken(String token);
}