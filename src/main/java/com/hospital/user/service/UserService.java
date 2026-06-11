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
     * JWT(Keycloak) 클레임으로 로컬 사용자 레코드를 동기화한다. 없으면 생성, 있으면 최신화.
     * - 이름: Keycloak 을 권위 소스로 항상 갱신한다. 과거 버전이 잘못 저장한 값(예: HTTP 헤더
     *   인코딩으로 깨진 모지바케)도 다음 조회 때 자동으로 치유된다.
     * - 전화번호: 로컬에 값이 없을 때만 클레임으로 초기 채운다(마이페이지 '정보 수정' 값 보존).
     */
    @Transactional
    public UserResponse syncFromKeycloak(String keycloakId, String email, String name, String phoneNumber) {
        User user = userRepository.findByKeycloakId(keycloakId)
                .orElseGet(() -> User.builder()
                        .keycloakId(keycloakId)
                        .role(DEFAULT_ROLE)
                        .build());

        if (email != null && !email.isBlank()) {
            user.setEmail(email);
        }
        if (name != null && !name.isBlank()) {
            user.setName(name);
        } else if (user.getName() == null) {
            user.setName(email);
        }
        if ((user.getPhoneNumber() == null || user.getPhoneNumber().isBlank())
                && phoneNumber != null && !phoneNumber.isBlank()) {
            user.setPhoneNumber(phoneNumber);
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
