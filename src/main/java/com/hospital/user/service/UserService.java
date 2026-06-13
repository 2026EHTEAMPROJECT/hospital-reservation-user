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

    /**
     * JWT(Keycloak) 클레임으로 로컬 사용자 레코드를 동기화한다. 없으면 생성, 있으면 보존.
     * - 이름·전화번호: 신규 생성 시에만 Keycloak 값으로 초기화한다. 기존 사용자는 마이페이지
     *   '정보 수정'으로 바꾼 값을 보존한다(매 조회마다 Keycloak 값으로 덮어쓰면 편집이 사라짐).
     */
    @Transactional
    public UserResponse syncFromKeycloak(String keycloakId, String email, String name, String phoneNumber) {
        User existing = userRepository.findByKeycloakId(keycloakId).orElse(null);
        boolean isNew = (existing == null);
        User user = isNew
                ? User.builder().keycloakId(keycloakId).role(DEFAULT_ROLE).build()
                : existing;

        if (email != null && !email.isBlank()) {
            user.setEmail(email);
        }
        if (isNew) {
            // 신규 사용자만 Keycloak 의 이름/전화번호로 초기화한다.
            user.setName((name != null && !name.isBlank()) ? name : email);
            if (phoneNumber != null && !phoneNumber.isBlank()) {
                user.setPhoneNumber(phoneNumber);
            }
        } else {
            // 기존 사용자: 로컬 값이 비어 있을 때만 클레임으로 보강(편집값은 보존).
            if ((user.getName() == null || user.getName().isBlank())
                    && name != null && !name.isBlank()) {
                user.setName(name);
            }
            if ((user.getPhoneNumber() == null || user.getPhoneNumber().isBlank())
                    && phoneNumber != null && !phoneNumber.isBlank()) {
                user.setPhoneNumber(phoneNumber);
            }
        }

        return toResponse(userRepository.save(user));
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
