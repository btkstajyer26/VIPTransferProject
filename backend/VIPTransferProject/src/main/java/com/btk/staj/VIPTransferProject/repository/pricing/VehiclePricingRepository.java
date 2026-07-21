package com.btk.staj.VIPTransferProject.repository.pricing;

import com.btk.staj.VIPTransferProject.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VehiclePricingRepository extends JpaRepository<Vehicle, Long> {

}