package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.ProfileRequest;
import com.unitrack.unitrack_backend.dto.response.ProfileResponse;
import com.unitrack.unitrack_backend.entity.Profile;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.repository.ProfileRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.security.Principal;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private ProfileResponse mapToResponse(Profile profile, User user) {
        Integer age = null;
        if (profile.getDob() != null) {
            age = Period.between(profile.getDob(), LocalDate.now()).getYears();
        }
        return ProfileResponse.builder()
                .id(profile.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(profile.getPhone())
                .universityEmail(profile.getUniversityEmail())
                .rollNumber(profile.getRollNumber())
                .course(profile.getCourse())
                .semester(profile.getSemester())
                .profilePicUrl(profile.getProfilePicUrl())
                .dob(profile.getDob())
                .age(age)
                .bloodGroup(profile.getBloodGroup())
                .address(profile.getAddress())
                .college(profile.getCollege())
                .branch(profile.getBranch())
                .batch(profile.getBatch())
                .enrolmentNumber(profile.getEnrolmentNumber())
                .fatherName(profile.getFatherName())
                .fatherPhone(profile.getFatherPhone())
                .motherName(profile.getMotherName())
                .motherPhone(profile.getMotherPhone())
                .emergencyContactName(profile.getEmergencyContactName())
                .emergencyContactPhone(profile.getEmergencyContactPhone())
                .emergencyContactRelation(profile.getEmergencyContactRelation())
                .build();
    }

    public ProfileResponse getProfile(Principal principal) {
        User user = getUser(principal);
        Profile profile = profileRepository.findByUser(user)
                .orElse(Profile.builder().user(user).build());
        return mapToResponse(profile, user);
    }

    public ProfileResponse updateProfile(Principal principal, ProfileRequest request) {
        User user = getUser(principal);
        Profile profile = profileRepository.findByUser(user)
                .orElse(Profile.builder().user(user).build());

        profile.setPhone(request.getPhone());
        profile.setUniversityEmail(request.getUniversityEmail());
        profile.setRollNumber(request.getRollNumber());
        profile.setCourse(request.getCourse());
        profile.setSemester(request.getSemester());
        profile.setProfilePicUrl(request.getProfilePicUrl());
        profile.setDob(request.getDob());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setAddress(request.getAddress());
        profile.setCollege(request.getCollege());
        profile.setBranch(request.getBranch());
        profile.setBatch(request.getBatch());
        profile.setEnrolmentNumber(request.getEnrolmentNumber());
        profile.setFatherName(request.getFatherName());
        profile.setFatherPhone(request.getFatherPhone());
        profile.setMotherName(request.getMotherName());
        profile.setMotherPhone(request.getMotherPhone());
        profile.setEmergencyContactName(request.getEmergencyContactName());
        profile.setEmergencyContactPhone(request.getEmergencyContactPhone());
        profile.setEmergencyContactRelation(request.getEmergencyContactRelation());

        profileRepository.save(profile);
        return mapToResponse(profile, user);
    }
}