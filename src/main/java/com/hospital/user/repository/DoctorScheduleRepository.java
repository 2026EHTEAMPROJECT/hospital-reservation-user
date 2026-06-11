package com.hospital.user.repository;

import com.hospital.user.domain.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {

    List<DoctorSchedule> findByDoctorIdAndReservedFalseOrderByDateAscStartTimeAsc(Long doctorId);

    boolean existsByDoctorId(Long doctorId);
}
