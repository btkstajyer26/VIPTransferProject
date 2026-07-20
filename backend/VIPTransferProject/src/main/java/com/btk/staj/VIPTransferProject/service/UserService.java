package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Misafir rezervasyon akışında kullanılır.
     * Verilen telefon numarasıyla kullanıcı varsa onu döner;
     * yoksa yeni bir misafir satırı oluşturur (is_guest=true).
     * phone_number UNIQUE kısıtı sayesinde aynı kişiye iki satır açılmaz.
     */
    @Transactional
    public User findOrCreateGuestUser(String phoneNumber, String guestName) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new RuntimeException("Misafir rezervasyon için telefon numarası zorunludur.");
        }
        return userRepository.findByPhoneNumber(phoneNumber)
                .orElseGet(() -> {
                    User guest = User.builder()
                            .phoneNumber(phoneNumber)
                            .firstName(guestName)
                            .guest(true)
                            .build();
                    User saved = userRepository.save(guest);
                    log.info("Yeni misafir kullanıcı oluşturuldu. id={}, phone={}", saved.getId(), phoneNumber);
                    return saved;
                });
    }
}
