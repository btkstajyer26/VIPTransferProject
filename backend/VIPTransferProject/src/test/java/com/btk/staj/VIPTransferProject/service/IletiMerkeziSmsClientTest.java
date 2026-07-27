package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.config.IletiMerkeziProperties;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class IletiMerkeziSmsClientTest {

    @Test
    void sendSms_missingApiUrl_reportsEnvironmentVariableName() {
        IletiMerkeziProperties properties = validProperties();
        properties.setApiUrl(" ");
        IletiMerkeziSmsClient client =
                new IletiMerkeziSmsClient(mock(RestClient.Builder.class), properties);

        assertThatThrownBy(() -> client.sendSms("905551112233", "Test"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ILETIMERKEZI_API_URL");
    }

    @Test
    void sendSms_missingApiKey_reportsEnvironmentVariableName() {
        IletiMerkeziProperties properties = validProperties();
        properties.setApiKey(null);
        IletiMerkeziSmsClient client =
                new IletiMerkeziSmsClient(mock(RestClient.Builder.class), properties);

        assertThatThrownBy(() -> client.sendSms("905551112233", "Test"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ILETIMERKEZI_API_KEY");
    }

    private IletiMerkeziProperties validProperties() {
        IletiMerkeziProperties properties = new IletiMerkeziProperties();
        properties.setApiUrl("https://example.test/sms");
        properties.setApiKey("key");
        properties.setApiHash("hash");
        properties.setSender("SENDER");
        return properties;
    }
}
