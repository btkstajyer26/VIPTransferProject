package com.btk.staj.VIPTransferProject.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;

    // E-posta doğrulama kodu gönderimi (15 dakika geçerli)
    public void sendVerificationEmail(String toEmail, String code) {
        if (!emailEnabled || mailSender == null) {
            log.info("Mail devre dışı — doğrulama kodu konsola yazılıyor. email={}, code={}", toEmail, code);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("VIP Transfer - E-Posta Doğrulama Kodu");
        message.setText(
                "VIP Transfer Sistemine hoş geldiniz!\n\n" +
                        "Hesabınızı aktifleştirmek için doğrulama kodunuz:\n\n" +
                        code +
                        "\n\nBu kod 15 dakika boyunca geçerlidir."
        );
        mailSender.send(message);
    }

    // Şifre sıfırlama kodu gönderimi (10 dakika geçerli)
    public void sendPasswordResetEmail(String toEmail, String code) {
        if (!emailEnabled || mailSender == null) {
            log.info("Mail devre dışı — şifre sıfırlama kodu konsola yazılıyor. email={}, code={}", toEmail, code);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("VIP Transfer - Şifre Sıfırlama");
        message.setText(
                "Şifre sıfırlama kodunuz: " + code + "\n\n" +
                        "Bu kod 10 dakika boyunca geçerlidir.\n" +
                        "Bu işlemi siz başlatmadıysanız lütfen bizimle iletişime geçin."
        );
        mailSender.send(message);
    }
}