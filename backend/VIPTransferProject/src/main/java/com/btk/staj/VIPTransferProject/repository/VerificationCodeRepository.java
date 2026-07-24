package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.VerificationCode;
import com.btk.staj.VIPTransferProject.enums.CodePurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {

    Optional<VerificationCode> findByUserAndPurpose(User user, CodePurpose purpose);

    void deleteByUserAndPurpose(User user, CodePurpose purpose);

    void deleteByUserId(Long userId);
}