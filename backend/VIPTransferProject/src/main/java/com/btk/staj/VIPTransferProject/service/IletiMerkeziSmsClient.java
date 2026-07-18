package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.config.IletiMerkeziProperties;
import com.btk.staj.VIPTransferProject.dto.notification.IletiMerkeziSmsRequest;
import com.btk.staj.VIPTransferProject.dto.notification.IletiMerkeziSmsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Component
@RequiredArgsConstructor
public class IletiMerkeziSmsClient {

    private final RestClient.Builder restClientBuilder;
    private final IletiMerkeziProperties properties;

    public void sendSms(
            String phoneNumber,
            String message
    ) {
        validateRequest(phoneNumber, message);

        IletiMerkeziSmsRequest requestBody = createRequestBody(
                phoneNumber,
                message
        );

        try {
            IletiMerkeziSmsResponse response = restClientBuilder
                    .build()
                    .post()
                    .uri(properties.getApiUrl())
                    .body(requestBody)
                    .retrieve()
                    .body(IletiMerkeziSmsResponse.class);

            validateResponse(response);

        } catch (RestClientException exception) {
            throw new IllegalStateException(
                    "İleti Merkezi SMS servisine bağlanırken hata oluştu.",
                    exception
            );
        }
    }

    private IletiMerkeziSmsRequest createRequestBody(
            String phoneNumber,
            String message
    ) {
        IletiMerkeziSmsRequest.Authentication authentication =
                new IletiMerkeziSmsRequest.Authentication(
                        properties.getApiKey(),
                        properties.getApiHash()
                );

        IletiMerkeziSmsRequest.Receipents receipents =
                new IletiMerkeziSmsRequest.Receipents(
                        List.of(phoneNumber)
                );

        IletiMerkeziSmsRequest.Message smsMessage =
                new IletiMerkeziSmsRequest.Message(
                        message,
                        receipents
                );

        IletiMerkeziSmsRequest.Order order =
                new IletiMerkeziSmsRequest.Order(
                        properties.getSender(),
                        "0",
                        smsMessage
                );

        IletiMerkeziSmsRequest.Request request =
                new IletiMerkeziSmsRequest.Request(
                        authentication,
                        order
                );

        return new IletiMerkeziSmsRequest(request);
    }

    private void validateResponse(IletiMerkeziSmsResponse response) {
        if (response == null) {
            throw new IllegalStateException(
                    "İleti Merkezi API boş cevap döndürdü."
            );
        }

        if (!response.isSuccessful()) {
            String errorMessage = getErrorMessage(response);

            throw new IllegalStateException(
                    "SMS gönderilemedi: " + errorMessage
            );
        }
    }

    private String getErrorMessage(IletiMerkeziSmsResponse response) {
        if (response.response() == null
                || response.response().status() == null
                || response.response().status().message() == null) {

            return "İleti Merkezi bilinmeyen bir hata döndürdü.";
        }

        return response.response().status().message();
    }

    private void validateRequest(
            String phoneNumber,
            String message
    ) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new IllegalArgumentException(
                    "Telefon numarası boş olamaz."
            );
        }

        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException(
                    "SMS mesajı boş olamaz."
            );
        }
    }
}