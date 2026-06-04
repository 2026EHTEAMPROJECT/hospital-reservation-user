package com.hospital.user.dto;

public record DoctorResponse(Long id, String name, String department, String hospitalName, boolean available) {}
