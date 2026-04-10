package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String universityEmail;
    private String rollNumber;
    private String course;
    private String semester;
    private String profilePicUrl;
    private LocalDate dob;
    private Integer age;
    private String bloodGroup;
    private String address;
    private String college;
    private String branch;
    private String batch;
    private String enrolmentNumber;
    private String fatherName;
    private String fatherPhone;
    private String motherName;
    private String motherPhone;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
}