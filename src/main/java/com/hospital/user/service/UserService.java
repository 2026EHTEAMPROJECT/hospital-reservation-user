package com.hospital.user.service;

import com.hospital.user.domain.User;
import com.hospital.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getUser(Long id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("사용자를 찾을 수 없습니다."));
    }
}