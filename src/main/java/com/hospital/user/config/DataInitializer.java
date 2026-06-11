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

    // 시드 대상 의사 명단(기존 3명 + 신규 5명 = 총 8명).
    // 이름 기준 멱등 추가이므로, 이미 존재하는 의사는 건너뛰고 없는 의사만 추가한다.
    private static final List<Doctor> SEED_DOCTORS = List.of(
            seedDoctor("김민준", "내과", "서울중앙병원"),
            seedDoctor("이서연", "정형외과", "서울중앙병원"),
            seedDoctor("박지훈", "피부과", "부산메디컬"),
            seedDoctor("정수빈", "이비인후과", "서울중앙병원"),
            seedDoctor("최예준", "안과", "부산메디컬"),
            seedDoctor("한지우", "소아청소년과", "대구열린병원"),
            seedDoctor("윤도현", "신경외과", "인천스마트병원"),
            seedDoctor("강하은", "치과", "대구열린병원"));

    private static Doctor seedDoctor(String name, String department, String hospitalName) {
        return Doctor.builder()
                .name(name)
                .department(department)
                .hospitalName(hospitalName)
                .available(true)
                .build();
    }

    @Override
    public void run(String... args) {
        // 1) 의사 멱등 추가: 이름이 없는 경우에만 저장
        for (Doctor seed : SEED_DOCTORS) {
            if (!doctorRepository.existsByName(seed.getName())) {
                doctorRepository.save(Doctor.builder()
                        .name(seed.getName())
                        .department(seed.getDepartment())
                        .hospitalName(seed.getHospitalName())
                        .available(seed.isAvailable())
                        .build());
            }
        }

        // 2) 스케줄 시드: 스케줄이 아직 없는 의사에 대해서만 생성(신규 추가 의사 포함)
        LocalDate today = LocalDate.now();
        for (Doctor doctor : doctorRepository.findAll()) {
            if (doctorScheduleRepository.existsByDoctorId(doctor.getId())) {
                continue;
            }
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
