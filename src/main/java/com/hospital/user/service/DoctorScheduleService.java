package com.hospital.user.service;

import com.hospital.user.dto.DoctorScheduleResponse;
import com.hospital.user.repository.DoctorScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorScheduleService {

    private final DoctorScheduleRepository doctorScheduleRepository;

    public List<DoctorScheduleResponse> getAvailableSlots(Long doctorId) {
        return doctorScheduleRepository
                .findByDoctorIdAndReservedFalseOrderByDateAscStartTimeAsc(doctorId)
                .stream()
                .map(s -> new DoctorScheduleResponse(
                        s.getId(),
                        s.getDoctorId(),
                        s.getDate().toString(),
                        s.getStartTime().toString(),
                        s.getEndTime().toString()))
                .toList();
    }
}
