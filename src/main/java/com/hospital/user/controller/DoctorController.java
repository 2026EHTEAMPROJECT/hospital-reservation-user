package com.hospital.user.controller;

import com.hospital.user.domain.Doctor;
import com.hospital.user.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorRepository doctorRepository;

    @GetMapping("/{id}")
    public Doctor getDoctor(@PathVariable Long id) {

        return doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("의사를 찾을 수 없습니다."));
    }
}