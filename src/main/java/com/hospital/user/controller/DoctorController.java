package com.hospital.user.controller;

import com.hospital.user.dto.DoctorResponse;
import com.hospital.user.dto.DoctorScheduleResponse;
import com.hospital.user.service.DoctorScheduleService;
import com.hospital.user.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;
    private final DoctorScheduleService doctorScheduleService;

    @GetMapping
    public List<DoctorResponse> getAllDoctors() {
        return doctorService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getDoctor(@PathVariable Long id) {
        return doctorService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/schedules")
    public List<DoctorScheduleResponse> getDoctorSchedules(@PathVariable Long id) {
        return doctorScheduleService.getAvailableSlots(id);
    }
}
