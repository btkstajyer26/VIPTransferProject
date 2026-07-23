package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FirebasePushClient {

    private final FirebaseMessaging firebaseMessaging;

    public String send(String fid, Notification notification)
            throws FirebaseMessagingException {
        Message.Builder messageBuilder = Message.builder()
                .setFid(fid)
                .setNotification(
                        com.google.firebase.messaging.Notification.builder()
                                .setTitle(notification.getTitle())
                                .setBody(notification.getMessage())
                                .build()
                )
                .putData("notificationId", notification.getId().toString())
                .putData("channel", notification.getChannel().name());

        if (notification.getReservation() != null
                && notification.getReservation().getId() != null) {
            messageBuilder.putData(
                    "reservationId",
                    notification.getReservation().getId().toString()
            );
        }

        return firebaseMessaging.send(messageBuilder.build());
    }
}
