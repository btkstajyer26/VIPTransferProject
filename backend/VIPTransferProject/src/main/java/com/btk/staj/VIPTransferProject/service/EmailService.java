package com.btk.staj.VIPTransferProject.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.base-url}")
    private String baseUrl;

    public void sendVerificationEmail(String toEmail, String token) {
        String confirmationUrl = baseUrl + "/api/auth/verify-email?token=" + token;

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