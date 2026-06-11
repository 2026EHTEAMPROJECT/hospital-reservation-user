package com.hospital.user.dto;

/**
 * 마이페이지 프로필 수정 요청 바디.
 * 이름·전화번호 범위만 수정한다. 이메일/역할은 인증 서버(Keycloak)가 관리하므로 제외한다.
 */
public record UserUpdateRequest(String name, String phoneNumber) {}
