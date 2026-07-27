package com.btk.staj.VIPTransferProject.config;

import com.btk.staj.VIPTransferProject.entity.NotificationTemplate;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationTemplateSeeder implements CommandLineRunner {

    private final NotificationTemplateRepository templateRepository;

    @Override
    public void run(String... args) {
        List<TemplateDefinition> definitions = List.of(
                // Reservation created: EMAIL, SMS, WHATSAPP, PUSH
                template("RESERVATION_CREATED", NotificationChannel.EMAIL, "tr",
                        "Rezervasyonunuz oluşturuldu",
                        """
                        Merhaba {{firstName}},

                        {{bookingReference}} numaralı rezervasyonunuz başarıyla oluşturuldu.

                        Alış konumu: {{pickupAddress}}
                        Varış konumu: {{dropoffAddress}}
                        Transfer tarihi: {{scheduledTime}}
                        Araç: {{vehicleName}}
                        Yolcu sayısı: {{passengerCount}}
                        Toplam tutar: {{calculatedPrice}} {{currency}}

                        Rezervasyon durumuyla ilgili gelişmeleri sizinle paylaşacağız.

                        VIP Transfer'ı tercih ettiğiniz için teşekkür ederiz.
                        """),
                template("RESERVATION_CREATED", NotificationChannel.EMAIL, "en",
                        "Your reservation has been created",
                        """
                        Hello {{firstName}},

                        Your reservation {{bookingReference}} has been created successfully.

                        Pickup: {{pickupAddress}}
                        Drop-off: {{dropoffAddress}}
                        Transfer date: {{scheduledTime}}
                        Vehicle: {{vehicleName}}
                        Passengers: {{passengerCount}}
                        Total amount: {{calculatedPrice}} {{currency}}

                        We will keep you informed about your reservation status.

                        Thank you for choosing VIP Transfer.
                        """),
                template("RESERVATION_CREATED", NotificationChannel.SMS, "tr",
                        "Rezervasyon oluşturuldu",
                        "VIP Transfer: {{bookingReference}} numaralı rezervasyonunuz {{scheduledTime}} "
                                + "tarihi için oluşturuldu. Tutar: {{calculatedPrice}} {{currency}}."),
                template("RESERVATION_CREATED", NotificationChannel.SMS, "en",
                        "Reservation created",
                        "VIP Transfer: Reservation {{bookingReference}} was created for {{scheduledTime}}. "
                                + "Total: {{calculatedPrice}} {{currency}}."),
                template("RESERVATION_CREATED", NotificationChannel.WHATSAPP, "tr",
                        "Rezervasyonunuz oluşturuldu",
                        """
                        Merhaba {{firstName}} 👋

                        Rezervasyonunuz başarıyla oluşturuldu.

                        Rezervasyon: {{bookingReference}}
                        Tarih: {{scheduledTime}}
                        Güzergâh: {{pickupAddress}} → {{dropoffAddress}}
                        Araç: {{vehicleName}}
                        Tutar: {{calculatedPrice}} {{currency}}

                        İyi yolculuklar dileriz.
                        """),
                template("RESERVATION_CREATED", NotificationChannel.WHATSAPP, "en",
                        "Your reservation has been created",
                        """
                        Hello {{firstName}} 👋

                        Your reservation has been created successfully.

                        Reservation: {{bookingReference}}
                        Date: {{scheduledTime}}
                        Route: {{pickupAddress}} → {{dropoffAddress}}
                        Vehicle: {{vehicleName}}
                        Total: {{calculatedPrice}} {{currency}}

                        We wish you a pleasant journey.
                        """),
                template("RESERVATION_CREATED", NotificationChannel.PUSH, "tr",
                        "Rezervasyonunuz oluşturuldu",
                        "{{bookingReference}} numaralı transferiniz {{scheduledTime}} için oluşturuldu."),
                template("RESERVATION_CREATED", NotificationChannel.PUSH, "en",
                        "Reservation created",
                        "Your transfer {{bookingReference}} was created for {{scheduledTime}}."),

                // Reservation status changed: EMAIL, WHATSAPP, PUSH
                template("RESERVATION_STATUS_CHANGED", NotificationChannel.EMAIL, "tr",
                        "Rezervasyon durumunuz güncellendi",
                        """
                        Merhaba {{firstName}},

                        {{bookingReference}} numaralı rezervasyonunuzun durumu güncellendi.

                        Önceki durum: {{oldStatus}}
                        Yeni durum: {{newStatus}}
                        Transfer tarihi: {{scheduledTime}}
                        Güzergâh: {{pickupAddress}} → {{dropoffAddress}}

                        Güncel rezervasyon bilgilerinizi uygulama üzerinden inceleyebilirsiniz.

                        VIP Transfer
                        """),
                template("RESERVATION_STATUS_CHANGED", NotificationChannel.EMAIL, "en",
                        "Your reservation status has been updated",
                        """
                        Hello {{firstName}},

                        The status of reservation {{bookingReference}} has been updated.

                        Previous status: {{oldStatus}}
                        New status: {{newStatus}}
                        Transfer date: {{scheduledTime}}
                        Route: {{pickupAddress}} → {{dropoffAddress}}

                        You can review the latest reservation details in the application.

                        VIP Transfer
                        """),
                template("RESERVATION_STATUS_CHANGED", NotificationChannel.WHATSAPP, "tr",
                        "Rezervasyon durumu güncellendi",
                        """
                        Merhaba {{firstName}},

                        {{bookingReference}} numaralı rezervasyonunuzun yeni durumu: {{newStatus}}.
                        Transfer tarihi: {{scheduledTime}}
                        """),
                template("RESERVATION_STATUS_CHANGED", NotificationChannel.WHATSAPP, "en",
                        "Reservation status updated",
                        """
                        Hello {{firstName}},

                        The new status of reservation {{bookingReference}} is {{newStatus}}.
                        Transfer date: {{scheduledTime}}
                        """),
                template("RESERVATION_STATUS_CHANGED", NotificationChannel.PUSH, "tr",
                        "Rezervasyon durumu güncellendi",
                        "{{bookingReference}} numaralı rezervasyonunuzun yeni durumu: {{newStatus}}."),
                template("RESERVATION_STATUS_CHANGED", NotificationChannel.PUSH, "en",
                        "Reservation status updated",
                        "The new status of reservation {{bookingReference}} is {{newStatus}}."),

                // Reservation cancelled: EMAIL, SMS, WHATSAPP, PUSH
                template("RESERVATION_CANCELLED", NotificationChannel.EMAIL, "tr",
                        "Rezervasyonunuz iptal edildi",
                        """
                        Merhaba {{firstName}},

                        {{bookingReference}} numaralı rezervasyonunuz iptal edildi.

                        Transfer tarihi: {{scheduledTime}}
                        Alış konumu: {{pickupAddress}}
                        Varış konumu: {{dropoffAddress}}
                        İptal nedeni: {{cancellationReason}}

                        Yardıma ihtiyaç duymanız halinde destek ekibimizle iletişime geçebilirsiniz.

                        VIP Transfer
                        """),
                template("RESERVATION_CANCELLED", NotificationChannel.EMAIL, "en",
                        "Your reservation has been cancelled",
                        """
                        Hello {{firstName}},

                        Your reservation {{bookingReference}} has been cancelled.

                        Transfer date: {{scheduledTime}}
                        Pickup: {{pickupAddress}}
                        Drop-off: {{dropoffAddress}}
                        Cancellation reason: {{cancellationReason}}

                        Please contact our support team if you need assistance.

                        VIP Transfer
                        """),
                template("RESERVATION_CANCELLED", NotificationChannel.SMS, "tr",
                        "Rezervasyon iptal edildi",
                        "VIP Transfer: {{bookingReference}} numaralı rezervasyonunuz iptal edildi. "
                                + "Destek için bizimle iletişime geçebilirsiniz."),
                template("RESERVATION_CANCELLED", NotificationChannel.SMS, "en",
                        "Reservation cancelled",
                        "VIP Transfer: Reservation {{bookingReference}} has been cancelled. "
                                + "Please contact us if you need assistance."),
                template("RESERVATION_CANCELLED", NotificationChannel.WHATSAPP, "tr",
                        "Rezervasyonunuz iptal edildi",
                        """
                        Merhaba {{firstName}},

                        {{bookingReference}} numaralı rezervasyonunuz iptal edildi.
                        İptal nedeni: {{cancellationReason}}

                        Yardım için destek ekibimizle iletişime geçebilirsiniz.
                        """),
                template("RESERVATION_CANCELLED", NotificationChannel.WHATSAPP, "en",
                        "Your reservation has been cancelled",
                        """
                        Hello {{firstName}},

                        Reservation {{bookingReference}} has been cancelled.
                        Reason: {{cancellationReason}}

                        You can contact our support team for assistance.
                        """),
                template("RESERVATION_CANCELLED", NotificationChannel.PUSH, "tr",
                        "Rezervasyon iptal edildi",
                        "{{bookingReference}} numaralı rezervasyonunuz iptal edildi."),
                template("RESERVATION_CANCELLED", NotificationChannel.PUSH, "en",
                        "Reservation cancelled",
                        "Reservation {{bookingReference}} has been cancelled."),

                // Reservation completed: EMAIL, PUSH
                template("RESERVATION_COMPLETED", NotificationChannel.EMAIL, "tr",
                        "Transferiniz tamamlandı",
                        """
                        Merhaba {{firstName}},

                        {{bookingReference}} numaralı transferiniz başarıyla tamamlandı.

                        Güzergâh: {{pickupAddress}} → {{dropoffAddress}}
                        Toplam tutar: {{calculatedPrice}} {{currency}}

                        Deneyiminizi uygulama üzerinden değerlendirebilirsiniz.
                        VIP Transfer'ı tercih ettiğiniz için teşekkür ederiz.
                        """),
                template("RESERVATION_COMPLETED", NotificationChannel.EMAIL, "en",
                        "Your transfer has been completed",
                        """
                        Hello {{firstName}},

                        Your transfer {{bookingReference}} has been completed successfully.

                        Route: {{pickupAddress}} → {{dropoffAddress}}
                        Total amount: {{calculatedPrice}} {{currency}}

                        You can rate your experience in the application.
                        Thank you for choosing VIP Transfer.
                        """),
                template("RESERVATION_COMPLETED", NotificationChannel.PUSH, "tr",
                        "Transferiniz tamamlandı",
                        "{{bookingReference}} numaralı transferiniz tamamlandı. Bizi tercih ettiğiniz için teşekkürler."),
                template("RESERVATION_COMPLETED", NotificationChannel.PUSH, "en",
                        "Transfer completed",
                        "Your transfer {{bookingReference}} is complete. Thank you for choosing us."),

                // Loyalty points earned: PUSH
                template("LOYALTY_POINTS_EARNED", NotificationChannel.PUSH, "tr",
                        "Sadakat puanı kazandınız",
                        "{{earnedPoints}} puan kazandınız. Toplam puanınız: {{lifetimePoints}}."),
                template("LOYALTY_POINTS_EARNED", NotificationChannel.PUSH, "en",
                        "You earned loyalty points",
                        "You earned {{earnedPoints}} points. Your total balance is {{lifetimePoints}} points."),

                // Loyalty tier upgraded: EMAIL, WHATSAPP, PUSH
                template("LOYALTY_TIER_UPGRADED", NotificationChannel.EMAIL, "tr",
                        "VIP Transfer üyelik seviyeniz yükseldi",
                        """
                        Merhaba {{firstName}},

                        Tebrikler! Sadakat seviyeniz {{oldTier}} seviyesinden {{newTier}} seviyesine yükseldi.

                        Toplam puanınız: {{lifetimePoints}}
                        Yeni indirim oranınız: %{{discountPercentage}}
                        Öncelikli destek: {{prioritySupport}}

                        Yeni seviyenizin ayrıcalıklarından hemen yararlanmaya başlayabilirsiniz.

                        VIP Transfer
                        """),
                template("LOYALTY_TIER_UPGRADED", NotificationChannel.EMAIL, "en",
                        "Your VIP Transfer membership tier has been upgraded",
                        """
                        Hello {{firstName}},

                        Congratulations! Your loyalty tier has been upgraded from {{oldTier}} to {{newTier}}.

                        Total points: {{lifetimePoints}}
                        New discount rate: {{discountPercentage}}%
                        Priority support: {{prioritySupport}}

                        You can start enjoying your new membership benefits immediately.

                        VIP Transfer
                        """),
                template("LOYALTY_TIER_UPGRADED", NotificationChannel.WHATSAPP, "tr",
                        "Üyelik seviyeniz yükseldi",
                        """
                        Tebrikler {{firstName}}! 🎉

                        VIP Transfer sadakat seviyeniz {{newTier}} oldu.
                        Toplam puanınız: {{lifetimePoints}}
                        Yeni indirim oranınız: %{{discountPercentage}}
                        """),
                template("LOYALTY_TIER_UPGRADED", NotificationChannel.WHATSAPP, "en",
                        "Your membership tier has been upgraded",
                        """
                        Congratulations {{firstName}}! 🎉

                        Your VIP Transfer loyalty tier is now {{newTier}}.
                        Total points: {{lifetimePoints}}
                        New discount rate: {{discountPercentage}}%
                        """),
                template("LOYALTY_TIER_UPGRADED", NotificationChannel.PUSH, "tr",
                        "Yeni seviyeniz: {{newTier}}",
                        "Tebrikler! {{newTier}} seviyesine yükseldiniz. Yeni ayrıcalıklarınız sizi bekliyor."),
                template("LOYALTY_TIER_UPGRADED", NotificationChannel.PUSH, "en",
                        "Your new tier: {{newTier}}",
                        "Congratulations! You reached {{newTier}} tier. Your new benefits are waiting.")
        );

        int createdCount = 0;
        int updatedCount = 0;
        for (TemplateDefinition definition : definitions) {
            NotificationTemplate existing = templateRepository.findByCodeAndChannelAndLangCode(
                    definition.code(),
                    definition.channel(),
                    definition.langCode()
            ).orElse(null);

            if (existing != null) {
                if (Objects.equals(existing.getSubject(), definition.subject())
                        && Objects.equals(existing.getContent(), definition.content())) {
                    continue;
                }

                existing.setSubject(definition.subject());
                existing.setContent(definition.content());
                templateRepository.save(existing);
                updatedCount++;
                continue;
            }

            templateRepository.save(NotificationTemplate.builder()
                    .code(definition.code())
                    .channel(definition.channel())
                    .langCode(definition.langCode())
                    .subject(definition.subject())
                    .content(definition.content())
                    .build());
            createdCount++;
        }

        log.info(
                "Notification template kontrolü tamamlandı. oluşturulan={}, güncellenen={}, değişmeyen={}",
                createdCount,
                updatedCount,
                definitions.size() - createdCount - updatedCount
        );
    }

    private TemplateDefinition template(
            String code,
            NotificationChannel channel,
            String langCode,
            String subject,
            String content
    ) {
        return new TemplateDefinition(code, channel, langCode, subject, content.strip());
    }

    private record TemplateDefinition(
            String code,
            NotificationChannel channel,
            String langCode,
            String subject,
            String content
    ) {
    }
}
