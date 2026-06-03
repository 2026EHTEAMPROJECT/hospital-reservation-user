package com.hospital.user.controller;

import com.hospital.user.domain.User;
import com.hospital.user.dto.UserResponse;
import com.hospital.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        User user = userService.getUser(id);
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}