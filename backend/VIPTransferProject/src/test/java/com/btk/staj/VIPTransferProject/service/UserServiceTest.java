package com.btk.staj.VIPTransferProject.service;

import com.btk.staj.VIPTransferProject.dto.UserResponse;
import com.btk.staj.VIPTransferProject.entity.User;
import com.btk.staj.VIPTransferProject.exception.UserNotFoundException;
import com.btk.staj.VIPTransferProject.mapper.UserMapper;
import com.btk.staj.VIPTransferProject.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepository;
    private UserMapper userMapper;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userMapper = mock(UserMapper.class);
        userService = new UserService(userRepository, userMapper);
    }

    @Test
    void getAllUsersMapsEveryActiveUserToResponse() {
        User firstUser = User.builder().id(1L).active(true).build();
        User secondUser = User.builder().id(2L).active(true).build();
        UserResponse firstResponse = UserResponse.builder().id(1L).active(true).build();
        UserResponse secondResponse = UserResponse.builder().id(2L).active(true).build();
        when(userRepository.findAllByActiveTrue()).thenReturn(List.of(firstUser, secondUser));
        when(userMapper.toResponse(firstUser)).thenReturn(firstResponse);
        when(userMapper.toResponse(secondUser)).thenReturn(secondResponse);

        List<UserResponse> result = userService.getAllUsers();

        assertEquals(List.of(firstResponse, secondResponse), result);
        verify(userRepository).findAllByActiveTrue();
        verify(userRepository, never()).findAll();
        verify(userMapper).toResponse(firstUser);
        verify(userMapper).toResponse(secondUser);
    }

    @Test
    void getAllUsersReturnsEmptyListWhenThereAreNoActiveUsers() {
        when(userRepository.findAllByActiveTrue()).thenReturn(List.of());

        List<UserResponse> result = userService.getAllUsers();

        assertTrue(result.isEmpty());
        verify(userRepository).findAllByActiveTrue();
        verify(userRepository, never()).findAll();
    }

    @Test
    void getUserByIdReturnsResponseForActiveUser() {
        Long userId = 1L;
        User user = User.builder().id(userId).active(true).build();
        UserResponse response = UserResponse.builder().id(userId).active(true).build();
        when(userRepository.findByIdAndActiveTrue(userId)).thenReturn(Optional.of(user));
        when(userMapper.toResponse(user)).thenReturn(response);

        UserResponse result = userService.getUserById(userId);

        assertSame(response, result);
        verify(userRepository).findByIdAndActiveTrue(userId);
        verify(userMapper).toResponse(user);
    }

    @Test
    void getUserByIdThrowsUserNotFoundExceptionWhenUserDoesNotExist() {
        Long userId = 98L;
        when(userRepository.findByIdAndActiveTrue(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getUserById(userId));
        verify(userRepository).findByIdAndActiveTrue(userId);
    }

    @Test
    void getUserByIdThrowsUserNotFoundExceptionForInactiveUser() {
        Long userId = 2L;
        when(userRepository.findByIdAndActiveTrue(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getUserById(userId));
        verify(userRepository).findByIdAndActiveTrue(userId);
    }

    @Test
    void deleteUserSoftDeletesActiveUser() {
        Long userId = 1L;
        User user = User.builder()
                .id(userId)
                .active(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.deleteUser(userId);

        assertFalse(user.isActive());
        assertNotNull(user.getDeletedAt());
        verify(userRepository).save(user);
    }

    @Test
    void deleteUserThrowsUserNotFoundExceptionWhenUserDoesNotExist() {
        Long userId = 99L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.deleteUser(userId));
    }

    @Test
    void deleteUserIsIdempotentForInactiveUser() {
        Long userId = 2L;
        User user = User.builder()
                .id(userId)
                .active(false)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.deleteUser(userId);

        verify(userRepository, never()).save(user);
    }
}
