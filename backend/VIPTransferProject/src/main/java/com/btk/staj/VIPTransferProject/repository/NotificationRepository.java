
package com.btk.staj.VIPTransferProject.repository;

import com.btk.staj.VIPTransferProject.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {
}