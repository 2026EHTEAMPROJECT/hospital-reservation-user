package com.hospital.user.controller;

import com.hospital.user.dto.UserResponse;
import com.hospital.user.dto.UserUpdateRequest;
import com.hospital.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        // 한국식 성+이름(family_name + given_name) 으로 표시 이름을 만든다.
        // 클레임이 없으면 name → preferred_username 순으로 graceful fallback.
        String family = jwt.getClaimAsString("family_name");
        String given = jwt.getClaimAsString("given_name");
        String name;
        if ((family != null && !family.isBlank()) || (given != null && !given.isBlank())) {
            name = ((family == null ? "" : family) + (given == null ? "" : given)).trim();
        } else {
            name = jwt.getClaimAsString("name");
            if (name == null) name = jwt.getClaimAsString("preferred_username");
        }
        String phoneNumber = jwt.getClaimAsString("phoneNumber");
        return ResponseEntity.ok(userService.syncFromKeycloak(keycloakId, email, name, phoneNumber));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@AuthenticationPrincipal Jwt jwt,
                                                 @RequestBody UserUpdateRequest request) {
        String keycloakId = jwt.getSubject();
        return userService.updateProfileByKeycloakId(keycloakId, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}