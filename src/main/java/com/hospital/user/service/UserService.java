package com.hospital.user.service;

import com.hospital.user.domain.User;
import com.hospital.user.dto.UserResponse;
import com.hospital.user.dto.UserUpdateRequest;
import com.hospital.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String DEFAULT_ROLE = "PATIENT";

    private final UserRepository userRepository;

    public Optional<UserResponse> findById(Long id) {
        return userRepository.findById(id).map(this::toResponse);
    }

    @Transactional
    public UserResponse getOrCreateByKeycloakId(String keycloakId, String email, String name) {
        return userRepository.findByKeycloakId(keycloakId)
                .map(this::toResponse)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .keycloakId(keycloakId)
                            .email(email)
                            .name(name != null ? name : email)
                            .role(DEFAULT_ROLE)
                            .build();
                    return toResponse(userRepository.save(newUser));
                });
    }

    /**
     * 마이페이지 프로필 수정(이름·전화번호). keycloakId(JWT subject)로 본인 레코드만 갱신한다.
     * 주의: 여기서는 user-service 로컬 DB만 갱신한다. Keycloak 측 프로필(이름 등) 동기화가
     * 필요하면 login-service의 Keycloak Admin API 연동 지점에서 함께 처리해야 한다.
     */
    @Transactional
    public Optional<UserResponse> updateProfileByKeycloakId(String keycloakId, UserUpdateRequest request) {
        return userRepository.findByKeycloakId(keycloakId)
                .map(user -> {
                    if (request.name() != null && !request.name().isBlank()) {
                        user.setName(request.name().trim());
                    }
                    if (request.phoneNumber() != null) {
                        user.setPhoneNumber(request.phoneNumber().trim());
                    }
                    return toResponse(userRepository.save(user));
                });
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getPhoneNumber(), user.getRole());
    }
}
