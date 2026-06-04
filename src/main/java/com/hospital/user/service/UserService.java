package com.hospital.user.service;

import com.hospital.user.domain.User;
import com.hospital.user.dto.UserResponse;
import com.hospital.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public Optional<UserResponse> findById(Long id) {
        return userRepository.findById(id)
                .map(u -> new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole()));
    }

    @Transactional
    public UserResponse getOrCreateByKeycloakId(String keycloakId, String email, String name) {
        return userRepository.findByKeycloakId(keycloakId)
                .map(u -> new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole()))
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .keycloakId(keycloakId)
                            .email(email)
                            .name(name != null ? name : email)
                            .role("PATIENT")
                            .build();
                    User saved = userRepository.save(newUser);
                    return new UserResponse(saved.getId(), saved.getName(), saved.getEmail(), saved.getRole());
                });
    }
}