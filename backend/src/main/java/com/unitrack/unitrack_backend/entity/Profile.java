package com.unitrack.unitrack_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String phone;
    private String universityEmail;
    private String rollNumber;
    private String course;
    private String semester;
    private String profilePicUrl;

    // Personal Info
    private LocalDate dob;
    private String bloodGroup;
    private String address;

    // Academic Details
    private String college;
    private String branch;
    private String batch;
    private String enrolmentNumber;

    // Parent Info
    private String fatherName;
    private String fatherPhone;
    private String motherName;
    private String motherPhone;

    // Emergency Contact
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
}