package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.UpdateUserRequest;
import com.btk.staj.VIPTransferProject.dto.UserResponse;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.exception.UserNotFoundException;
import com.btk.staj.VIPTransferProject.mapper.UserMapper;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /*
     * ADMIN işlemi:
     * Sistemdeki aktif kullanıcıları listeler.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAllByActiveTrue()
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }

    /*
     * ADMIN işlemi:
     * Verilen ID'ye sahip aktif kullanıcıyı getirir.
     */
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = findActiveUserById(id);

        return userMapper.toResponse(user);
    }

    /*
     * Giriş yapan kullanıcının kendi profilini getirir.
     * userId, controller tarafından JWT principal içinden gönderilir.
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = findActiveUserById(userId);

        return userMapper.toResponse(user);
    }

    /*
     * Giriş yapan kullanıcının kendi profilini günceller.
     */
    @Transactional
    public UserResponse updateCurrentUser(
            Long userId,
            UpdateUserRequest request) {

        User user = findActiveUserById(userId);

        userMapper.updateEntity(request, user);

        User updatedUser = userRepository.save(user);

        return userMapper.toResponse(updatedUser);
    }

    /*
     * Giriş yapan kullanıcının kendi hesabını soft delete yapar.
     */
    @Transactional
    public void deleteCurrentUser(Long userId) {
        User user = findActiveUserById(userId);

        user.setActive(false);
        user.setDeletedAt(OffsetDateTime.now());

        userRepository.save(user);
    }

    /*
     * Aktif kullanıcı bulma işlemini tek bir noktada topluyoruz.
     */
    private User findActiveUserById(Long id) {
        return userRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new UserNotFoundException(id));
    }
}