package com.btk.staj.VIPTransferProject.exception;

public class VehicleNotFoundException extends RuntimeException {

    public VehicleNotFoundException(Long id) {
        super("Araç bulunamadı. ID: " + id);
    }
}
