package com.hospital.user.service;

import com.hospital.user.dto.UserResponse;
import com.hospital.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public Optional<UserResponse> findById(Long id) {
        return userRepository.findById(id)
                .map(u -> new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole()));
    }
}