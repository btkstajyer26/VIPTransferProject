

package com.btk.staj.VIPTransferProject.strategy;

import com.btk.staj.VIPTransferProject.entity.Notification;
import com.btk.staj.VIPTransferProject.enums.NotificationChannel;

public interface NotificationSender {

    NotificationChannel getSupportedChannel();

    void send(Notification notification);
}