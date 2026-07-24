package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.NotificationSendException;
import com.btk.staj.VIPTransferProject.service.IletiMerkeziSmsClient;
import com.btk.staj.VIPTransferProject.service.MetaWhatsappClient;
import com.btk.staj.VIPTransferProject.repository.UserFirebaseInstallationRepository;
import com.btk.staj.VIPTransferProject.service.FirebasePushClient;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationSenderTest {

    @Test
    void smsSender_unverifiedRegisteredUser_doesNotCallProvider() {
        SmsNotificationSender sender =
                new SmsNotificationSender(mock(IletiMerkeziSmsClient.class));
        Notification notification = notification(NotificationChannel.SMS);
        notification.getUser().setPhoneVerified(false);

        assertThatThrownBy(() -> sender.send(notification))
                .isInstanceOf(NotificationSendException.class)
                .hasMessageContaining("dogrulanmamis");
    }

    @Test
    void whatsappSender_providerDetail_isReplacedWithSafeMessage() {
        MetaWhatsappClient client = mock(MetaWhatsappClient.class);
        WhatsappNotificationSender sender = new WhatsappNotificationSender(client);
        Notification notification = notification(NotificationChannel.WHATSAPP);
        doThrow(new IllegalStateException("provider-secret-detail"))
                .when(client)
                .sendTextMessage("905551112233", "Mesaj");

        assertThatThrownBy(() -> sender.send(notification))
                .isInstanceOf(NotificationSendException.class)
                .hasMessageContaining("WhatsApp servisine gonderim")
                .hasMessageNotContaining("provider-secret-detail");
    }

    @Test
    void emailSender_providerDetail_isReplacedWithSafeMessage() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        EmailNotificationSender sender = new EmailNotificationSender(mailSender);
        Notification notification = notification(NotificationChannel.EMAIL);
        notification.getUser().setEmail("user@example.com");
        notification.getUser().setEmailVerified(true);
        doThrow(new MailSendException("smtp-secret-detail"))
                .when(mailSender)
                .send(org.mockito.ArgumentMatchers.any(
                        org.springframework.mail.SimpleMailMessage.class
                ));

        assertThatThrownBy(() -> sender.send(notification))
                .isInstanceOf(NotificationSendException.class)
                .hasMessageContaining("Email servisine gonderim")
                .hasMessageNotContaining("smtp-secret-detail");
    }

    @Test
    void pushSender_withoutActiveInstallation_failsBeforeProviderCall() {
        FirebasePushClient client = mock(FirebasePushClient.class);
        UserFirebaseInstallationRepository repository =
                mock(UserFirebaseInstallationRepository.class);
        PushNotificationSender sender =
                new PushNotificationSender(client, repository);
        Notification notification = notification(NotificationChannel.PUSH);
        when(repository.findAllByUserIdAndActiveTrue(7L))
                .thenReturn(List.of());

        assertThatThrownBy(() -> sender.send(notification))
                .isInstanceOf(NotificationSendException.class)
                .hasMessageContaining("aktif Firebase installation");
    }

    private Notification notification(NotificationChannel channel) {
        User user = User.builder()
                .id(7L)
                .phoneNumber("905551112233")
                .phoneVerified(true)
                .build();
        return Notification.builder()
                .id(12L)
                .user(user)
                .channel(channel)
                .title("Baslik")
                .message("Mesaj")
                .build();
    }
}
