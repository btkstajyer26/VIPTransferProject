
package com.btk.staj.VIPTransferProject.dto.notification;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
public class CreateNotificationRequest {

    @NotNull(message = "Kullanıcı ID bilgisi zorunludur.")
    private Long userId;

    private Long reservationId;

    @NotBlank(message = "Bildirim şablon kodu zorunludur.")
    private String templateCode;

    @NotNull(message = "Bildirim kanalı zorunludur.")
    private NotificationChannel channel;

    @NotBlank(message = "Dil kodu zorunludur.")
    private String langCode;

    private Map<String, String> variables = new HashMap<>();

    private boolean sendImmediately = true;
}