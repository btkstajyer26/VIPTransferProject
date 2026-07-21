package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByIdAndActiveTrue(Long id);

    List<Vehicle> findAllByActiveTrueOrderByOpeningPriceAsc();

    boolean existsByPlateNumber(String plateNumber);
}
