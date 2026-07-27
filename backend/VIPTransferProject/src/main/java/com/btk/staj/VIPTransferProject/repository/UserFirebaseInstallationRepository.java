package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.UserFirebaseInstallation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFirebaseInstallationRepository
        extends JpaRepository<UserFirebaseInstallation, Long> {

    List<UserFirebaseInstallation> findAllByUserIdAndActiveTrue(Long userId);

    Optional<UserFirebaseInstallation> findByFid(String fid);
}
