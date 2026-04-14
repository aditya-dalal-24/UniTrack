package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.response.AdminStatsResponse;
import com.unitrack.unitrack_backend.dto.response.AdminUserResponse;
import com.unitrack.unitrack_backend.entity.Role;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;

    @Value("${app.super-admin-email}")
    private String superAdminEmail;

    // ==================== LIST USERS ====================

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ==================== STATS ====================

    public AdminStatsResponse getStats() {
        long total = userRepository.count();
        long admins = userRepository.countByRole(Role.ADMIN) + userRepository.countByRole(Role.BOTH) + userRepository.countByRole(Role.SUPER_ADMIN);
        long active = userRepository.countByIsActive(true);
        long inactive = userRepository.countByIsActive(false);

        return AdminStatsResponse.builder()
                .totalUsers(total)
                .totalAdmins(admins)
                .activeUsers(active)
                .inactiveUsers(inactive)
                .build();
    }

    // ==================== ACTIVATE / DEACTIVATE ====================

    public AdminUserResponse activateUser(Long userId, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setActive(true);
        user.setUpdatedBy(adminEmail);
        userRepository.save(user);
        return toResponse(user);
    }

    public AdminUserResponse deactivateUser(Long userId, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Prevent deactivating the super admin
        if (user.getEmail().equalsIgnoreCase(superAdminEmail)) {
            throw new RuntimeException("Cannot deactivate the super admin account.");
        }

        user.setActive(false);
        user.setUpdatedBy(adminEmail);
        userRepository.save(user);
        return toResponse(user);
    }

    // ==================== CHANGE ROLE (SUPER ADMIN ONLY) ====================

    public AdminUserResponse changeUserRole(Long userId, String newRoleStr, String requestorEmail) {
        User requestor = userRepository.findByEmail(requestorEmail).orElseThrow();
        Role requestorRole = requestor.getEmail().equalsIgnoreCase(superAdminEmail) ? Role.SUPER_ADMIN : requestor.getRole();

        // Only super admin can change roles
        if (requestorRole != Role.SUPER_ADMIN) {
            throw new RuntimeException("Only a super admin can change user roles.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with this ID."));

        // Prevent super admin from removing their own admin rights
        if (user.getEmail().equalsIgnoreCase(superAdminEmail)) {
            throw new RuntimeException("Cannot change the primary super admin's role.");
        }

        // Validate role value
        Role newRole;
        try {
            newRole = Role.valueOf(newRoleStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role. Must be STUDENT, ADMIN, BOTH, or SUPER_ADMIN.");
        }

        user.setRole(newRole);
        user.setUpdatedBy(requestorEmail);
        userRepository.save(user);
        return toResponse(user);
    }

    // ==================== HELPER ====================

    private AdminUserResponse toResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getEmail().equalsIgnoreCase(superAdminEmail) ? "SUPER_ADMIN" : user.getRole().name())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .updatedBy(user.getUpdatedBy())
                .build();
    }
}
