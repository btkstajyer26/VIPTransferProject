package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.notification.FirebaseInstallationResponse;
import com.btk.staj.VIPTransferProject.dto.notification.RegisterFirebaseInstallationRequest;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.entity.UserFirebaseInstallation;
import com.btk.staj.VIPTransferProject.repository.UserFirebaseInstallationRepository;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserFirebaseInstallationService {

    private final UserFirebaseInstallationRepository installationRepository;
    private final UserRepository userRepository;

    @Transactional
    public FirebaseInstallationResponse register(
            String authenticatedPhoneNumber,
            RegisterFirebaseInstallationRequest request
    ) {
        User user = findAuthenticatedUser(authenticatedPhoneNumber);
        String normalizedFid = request.fid().trim();

        UserFirebaseInstallation installation = installationRepository
                .findByFid(normalizedFid)
                .orElseGet(UserFirebaseInstallation::new);

        installation.setUser(user);
        installation.setFid(normalizedFid);
        installation.setPlatform(request.platform());
        installation.setActive(true);

        return toResponse(installationRepository.save(installation));
    }

    @Transactional
    public void deactivate(String authenticatedPhoneNumber, Long installationId) {
        User user = findAuthenticatedUser(authenticatedPhoneNumber);
        UserFirebaseInstallation installation = installationRepository
                .findById(installationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Firebase installation kaydi bulunamadi. ID: " + installationId
                ));

        if (!installation.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException(
                    "Bu Firebase installation kaydi kullaniciya ait degil."
            );
        }

        installation.setActive(false);
        installationRepository.save(installation);
    }

    private User findAuthenticatedUser(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new IllegalStateException(
                        "Kimligi dogrulanan kullanici bulunamadi."
                ));
    }

    private FirebaseInstallationResponse toResponse(
            UserFirebaseInstallation installation
    ) {
        return new FirebaseInstallationResponse(
                installation.getId(),
                installation.getPlatform(),
                installation.isActive(),
                installation.getCreatedAt(),
                installation.getUpdatedAt()
        );
    }
}
