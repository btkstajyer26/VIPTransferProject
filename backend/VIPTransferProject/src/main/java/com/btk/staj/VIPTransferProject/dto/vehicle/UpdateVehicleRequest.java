package com.btk.staj.VIPTransferProject.dto.vehicle;

import com.btk.staj.VIPTransferProject.enums.VehicleClass;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class UpdateVehicleRequest {

    @Size(max = 20, message = "Plaka en fazla 20 karakter olabilir.")
    private String plateNumber;

    private VehicleClass vehicleClass;

    @Size(max = 50, message = "Marka en fazla 50 karakter olabilir.")
    private String brand;

    @Size(max = 50, message = "Model en fazla 50 karakter olabilir.")
    private String model;

    @Min(value = 1900, message = "Yıl 1900'den küçük olamaz.")
    @Max(value = 2100, message = "Yıl 2100'den büyük olamaz.")
    private Short year;

    @Size(max = 30, message = "Renk en fazla 30 karakter olabilir.")
    private String color;

    @Size(max = 500, message = "Fotoğraf URL'si en fazla 500 karakter olabilir.")
    private String photoUrl;

    @Min(value = 1, message = "Kapasite en az 1 olmalıdır.")
    @Max(value = 99, message = "Kapasite en fazla 99 olabilir.")
    private Short capacity;

    @DecimalMin(value = "0.0", inclusive = false, message = "Taban fiyat çarpanı sıfırdan büyük olmalıdır.")
    private BigDecimal basePriceMultiplier;

    @DecimalMin(value = "0.0", message = "Başlangıç fiyatı negatif olamaz.")
    private BigDecimal openingPrice;
}
