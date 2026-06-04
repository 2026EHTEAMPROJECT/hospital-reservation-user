package com.hospital.user.service;

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
                .map(d -> new DoctorResponse(d.getId(), d.getName(), d.getDepartment(), d.getHospitalName(), d.isAvailable()))
                .toList();
    }

    public Optional<DoctorResponse> findById(Long id) {
        return doctorRepository.findById(id)
                .map(d -> new DoctorResponse(d.getId(), d.getName(), d.getDepartment(), d.getHospitalName(), d.isAvailable()));
    }
}
