package com.btk.staj.VIPTransferProject.util;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Year;

@Component
public class BookingReferenceGenerator {

    // I, L, O, 0, 1 hariç — kağıtta/ekranda karışmaz (örn. 1↔I, 0↔O)
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int SUFFIX_LENGTH = 8;

    public String generate() {
        String year = String.valueOf(Year.now().getValue());
        StringBuilder suffix = new StringBuilder(SUFFIX_LENGTH);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            suffix.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return "BTK-" + year + "-" + suffix; // örn. BTK-2026-K3P2MQ
    }
}
