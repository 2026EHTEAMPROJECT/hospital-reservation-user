package com.hospital.user.config;

import com.hospital.user.domain.Doctor;
import com.hospital.user.domain.DoctorSchedule;
import com.hospital.user.repository.DoctorRepository;
import com.hospital.user.repository.DoctorScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository doctorScheduleRepository;

    private static final List<LocalTime> TIME_SLOTS = List.of(
            LocalTime.of(9, 0),
            LocalTime.of(10, 0),
            LocalTime.of(11, 0),
            LocalTime.of(14, 0),
            LocalTime.of(15, 0));

    @Override
    public void run(String... args) {
        if (doctorRepository.count() == 0) {
            doctorRepository.save(Doctor.builder()
                    .name("김민준")
                    .department("내과")
                    .hospitalName("서울중앙병원")
                    .available(true)
                    .build());
            doctorRepository.save(Doctor.builder()
                    .name("이서연")
                    .department("정형외과")
                    .hospitalName("서울중앙병원")
                    .available(true)
                    .build());
            doctorRepository.save(Doctor.builder()
                    .name("박지훈")
                    .department("피부과")
                    .hospitalName("부산메디컬")
                    .available(true)
                    .build());
        }

        if (doctorScheduleRepository.count() == 0) {
            LocalDate today = LocalDate.now();
            for (Doctor doctor : doctorRepository.findAll()) {
                for (int dayOffset = 1; dayOffset <= 3; dayOffset++) {
                    LocalDate date = today.plusDays(dayOffset);
                    for (LocalTime slot : TIME_SLOTS) {
                        doctorScheduleRepository.save(DoctorSchedule.builder()
                                .doctorId(doctor.getId())
                                .date(date)
                                .startTime(slot)
                                .endTime(slot.plusHours(1))
                                .reserved(false)
                                .build());
                    }
                }
            }
        }
    }
}
