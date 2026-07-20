package com.btk.staj.VIPTransferProject.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
@Data
@Builder
public class ApiResponse<T> {
    private int status;
    private String message;
    private T data;
    private OffsetDateTime timestamp;
}
