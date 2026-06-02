package com.hospital.user.controller;

import com.hospital.user.dto.LoginRequest;
import com.hospital.user.dto.LoginResponse;
import com.hospital.user.dto.SignupRequest;
import com.hospital.user.dto.UserResponse;
import com.hospital.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public String signup(@Valid @RequestBody SignupRequest request) {
        System.out.println("회원가입 요청 들어옴 : " + request.getEmail());
        userService.signup(request);

        return "회원가입 성공";
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {

        return userService.login(request);
    }

    @GetMapping("/{id}")
    public com.hospital.user.domain.User getUser(
            @PathVariable Long id) {

        return userService.getUser(id);
    }
}