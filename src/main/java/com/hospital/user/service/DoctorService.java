package com.hospital.user.service;

import com.hospital.user.domain.Doctor;
import com.hospital.user.dto.DoctorResponse;
import com.hospital.user.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public List<DoctorResponse> findAll() {
        return doctorRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public Optional<DoctorResponse> findById(Long id) {
        return doctorRepository.findById(id)
                .map(this::toResponse);
    }

    private DoctorResponse toResponse(Doctor d) {
        return new DoctorResponse(d.getId(), d.getName(), d.getDepartment(), d.getHospitalName(), d.isAvailable());
    }
}
