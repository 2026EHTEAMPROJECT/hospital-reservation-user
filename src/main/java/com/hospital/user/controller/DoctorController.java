package com.hospital.user.controller;

import com.hospital.user.domain.Doctor;
import com.hospital.user.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorRepository doctorRepository;

    // 전체 의사 조회
    @GetMapping
    public List<Doctor> getAllDoctors() {

        return doctorRepository.findAll();
    }

    // 의사 단건 조회
    @GetMapping("/{id}")
    public Doctor getDoctor(@PathVariable Long id) {

        return doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("의사를 찾을 수 없습니다."));
    }
}