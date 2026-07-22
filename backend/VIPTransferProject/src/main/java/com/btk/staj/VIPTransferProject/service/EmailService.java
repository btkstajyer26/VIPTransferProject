package com.btk.staj.VIPTransferProject.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String token) {
        // Ön yüz bağlantısı veya doğrudan backend doğrulama adresi
        String confirmationUrl = "http://localhost:8080/api/v1/auth/verify-email?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("VIP Transfer - E-Posta Doğrulama");
        message.setText("VIP Transfer Sistemine hoş geldiniz!\n\n" +
                "Hesabınızı aktifleştirmek için lütfen aşağıdaki bağlantıya tıklayın:\n" +
                confirmationUrl + "\n\n" +
                "Bu bağlantı 30 dakika boyunca geçerlidir.");

        mailSender.send(message);
    }
}