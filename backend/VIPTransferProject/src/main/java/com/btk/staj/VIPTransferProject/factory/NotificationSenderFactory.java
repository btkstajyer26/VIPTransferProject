package com.btk.staj.VIPTransferProject.factory;

import com.btk.staj.VIPTransferProject.enums.NotificationChannel;
import com.btk.staj.VIPTransferProject.exception.UnsupportedNotificationChannelException;
import com.btk.staj.VIPTransferProject.strategy.NotificationSender;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class NotificationSenderFactory {

    private final Map<NotificationChannel, NotificationSender> senders;

    public NotificationSenderFactory(List<NotificationSender> senderList) {
        this.senders = new EnumMap<>(NotificationChannel.class);

        for (NotificationSender sender : senderList) {
            senders.put(sender.getSupportedChannel(), sender);
        }
    }

    public NotificationSender getSender(NotificationChannel channel) {
        NotificationSender sender = senders.get(channel);

        if (sender == null) {
            throw new UnsupportedNotificationChannelException(channel);
        }

        return sender;
    }
}