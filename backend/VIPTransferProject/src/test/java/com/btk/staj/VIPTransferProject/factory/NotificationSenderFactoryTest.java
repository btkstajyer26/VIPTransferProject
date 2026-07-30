package com.btk.staj.VIPTransferProject.factory;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.UnsupportedNotificationChannelException;
import com.btk.staj.VIPTransferProject.strategy.NotificationSender;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationSenderFactoryTest {

    @Test
    void getSender_returnsSenderForSupportedChannel() {
        NotificationSender smsSender = mock(NotificationSender.class);
        when(smsSender.getSupportedChannel()).thenReturn(NotificationChannel.SMS);
        NotificationSenderFactory factory =
                new NotificationSenderFactory(List.of(smsSender));

        assertThat(factory.getSender(NotificationChannel.SMS))
                .isSameAs(smsSender);
    }

    @Test
    void getSender_unsupportedChannel_throwsDomainException() {
        NotificationSenderFactory factory =
                new NotificationSenderFactory(List.of());

        assertThatThrownBy(() -> factory.getSender(NotificationChannel.PUSH))
                .isInstanceOf(UnsupportedNotificationChannelException.class);
    }
}
