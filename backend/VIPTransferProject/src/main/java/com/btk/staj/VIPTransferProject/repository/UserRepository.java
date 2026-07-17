package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPhoneNumber(String phoneNumber);

    Optional<User> findByIdAndActiveTrue(Long id);
}