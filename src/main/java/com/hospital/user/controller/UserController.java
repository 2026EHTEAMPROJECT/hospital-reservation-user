package com.hospital.user.controller;

import com.hospital.user.dto.SignupRequest;
import com.hospital.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.hospital.user.dto.LoginRequest;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public String signup(@Valid @RequestBody SignupRequest request) {

        userService.signup(request);

        return "회원가입 성공";
    }

    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request) {

        return userService.login(request);
    }
}