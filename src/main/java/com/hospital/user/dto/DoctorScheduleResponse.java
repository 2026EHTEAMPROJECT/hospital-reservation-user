package com.hospital.user.dto;

public record DoctorScheduleResponse(Long id, Long doctorId, String date, String startTime, String endTime) {}
