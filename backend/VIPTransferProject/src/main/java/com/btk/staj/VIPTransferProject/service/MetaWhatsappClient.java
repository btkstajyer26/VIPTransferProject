package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.config.WhatsappProperties;
import com.btk.staj.VIPTransferProject.dto.notification.WhatsappSendResponse;
import com.btk.staj.VIPTransferProject.dto.notification.WhatsappTextMessageRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
@RequiredArgsConstructor
public class MetaWhatsappClient {

    private static final String API_VERSION_PLACEHOLDER = "vXX.X";

    private final RestClient.Builder restClientBuilder;
    private final WhatsappProperties properties;

    public String sendTextMessage(String phoneNumber, String message) {
        validateConfiguration();
        validateRequest(phoneNumber, message);

        String normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

        WhatsappTextMessageRequest requestBody =
                WhatsappTextMessageRequest.create(normalizedPhoneNumber, message);

        try {
            WhatsappSendResponse response = restClientBuilder
                    .build()
                    .post()
                    .uri(buildMessagesUrl())
                    .header(HttpHeaders.AUTHORIZATION,
                            "Bearer " + properties.getAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(WhatsappSendResponse.class);

            return getMessageId(response);
        } catch (RestClientResponseException exception) {
            throw new IllegalStateException(
                    "Meta WhatsApp API mesaji kabul etmedi. HTTP status: "
                            + exception.getStatusCode().value(),
                    exception
            );
        } catch (RestClientException exception) {
            throw new IllegalStateException(
                    "Meta WhatsApp API ile iletisim sirasinda hata olustu.",
                    exception
            );
        }
    }

    private String buildMessagesUrl() {
        String apiUrl = properties.getApiUrl();
        String normalizedApiUrl = apiUrl.endsWith("/")
                ? apiUrl.substring(0, apiUrl.length() - 1)
                : apiUrl;

        return normalizedApiUrl
                + "/" + properties.getApiVersion()
                + "/" + properties.getPhoneNumberId()
                + "/messages";
    }

    private String getMessageId(WhatsappSendResponse response) {
        String messageId = response == null ? null : response.getMessageId();

        if (!StringUtils.hasText(messageId)) {
            throw new IllegalStateException(
                    "Meta WhatsApp API cevabinda message id bulunamadi."
            );
        }

        return messageId;
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(properties.getApiUrl())) {
            throw new IllegalStateException("WHATSAPP_API_URL tanimli degil.");
        }

        if (!StringUtils.hasText(properties.getApiVersion())) {
            throw new IllegalStateException("WHATSAPP_API_VERSION tanimli degil.");
        }

        /*
         * Meta panelinden guncel API surumu alindiginda
         * WHATSAPP_API_VERSION environment variable'i degistirilmelidir.
         */
        if (API_VERSION_PLACEHOLDER.equalsIgnoreCase(
                properties.getApiVersion().trim())) {
            throw new IllegalStateException(
                    "WHATSAPP_API_VERSION placeholder degerinde. "
                            + "Meta panelindeki guncel API surumunu tanimlayin."
            );
        }

        if (!StringUtils.hasText(properties.getAccessToken())) {
            throw new IllegalStateException("WHATSAPP_ACCESS_TOKEN tanimli degil.");
        }

        if (!StringUtils.hasText(properties.getPhoneNumberId())) {
            throw new IllegalStateException("WHATSAPP_PHONE_NUMBER_ID tanimli degil.");
        }
    }

    private void validateRequest(String phoneNumber, String message) {
        if (!StringUtils.hasText(phoneNumber)) {
            throw new IllegalArgumentException(
                    "WhatsApp alici telefon numarasi bos olamaz."
            );
        }

        if (!StringUtils.hasText(message)) {
            throw new IllegalArgumentException("WhatsApp mesaji bos olamaz.");
        }
    }

    private String normalizePhoneNumber(String phoneNumber) {
        String normalizedPhoneNumber = phoneNumber.replaceAll("\\D", "");

        if (normalizedPhoneNumber.startsWith("0")) {
            return "90" + normalizedPhoneNumber.substring(1);
        }

        return normalizedPhoneNumber;
    }
}
