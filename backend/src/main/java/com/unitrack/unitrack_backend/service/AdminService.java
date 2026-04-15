package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.response.AdminStatsResponse;
import com.unitrack.unitrack_backend.dto.response.AdminUserResponse;
import com.unitrack.unitrack_backend.entity.Role;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final TodoRepository todoRepository;
    private final SubjectRepository subjectRepository;
    private final TimetableRepository timetableRepository;
    private final MarksRepository marksRepository;
    private final FeesRepository feesRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final AttendanceRepository attendanceRepository;
    private final AssignmentRepository assignmentRepository;

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

        // Total Admins: users with ADMIN or BOTH role
        long admins = userRepository.countByRole(Role.ADMIN) + userRepository.countByRole(Role.BOTH);

        // Total Super Admins: users with SUPER_ADMIN role
        long totalSuperAdmins = userRepository.countByRole(Role.SUPER_ADMIN);

        // Also include the primary super admin if their DB role is not SUPER_ADMIN
        boolean primarySuperAdminCounted = userRepository.findByEmail(superAdminEmail)
                .map(u -> u.getRole() == Role.SUPER_ADMIN)
                .orElse(true); // if not found, don't add extra count
        if (!primarySuperAdminCounted) {
            totalSuperAdmins++;
        }

        // The primary super admin is always an admin, so include in admins count too if not already
        boolean primaryInAdminPool = userRepository.findByEmail(superAdminEmail)
                .map(u -> u.getRole() == Role.ADMIN || u.getRole() == Role.BOTH || u.getRole() == Role.SUPER_ADMIN)
                .orElse(true);
        if (!primaryInAdminPool) {
            admins++;
        }

        long active = userRepository.countByIsActive(true);
        long inactive = userRepository.countByIsActive(false);

        return AdminStatsResponse.builder()
                .totalUsers(total)
                .totalAdmins(admins + totalSuperAdmins)
                .totalSuperAdmins(totalSuperAdmins)
                .activeUsers(active)
                .inactiveUsers(inactive)
                .build();
    }

    // ==================== ACTIVATE / DEACTIVATE ====================

    public AdminUserResponse activateUser(Long userId, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Prevent modifying the super admin's active status
        if (user.getEmail().equalsIgnoreCase(superAdminEmail)) {
            throw new RuntimeException("Cannot modify the super admin account.");
        }

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

        // Prevent super admin from changing their own role
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

    // ==================== PERMANENT DELETE ====================

    @Transactional
    public void deleteUser(Long userId, String requestorEmail) {
        User requestor = userRepository.findByEmail(requestorEmail).orElseThrow();
        Role requestorRole = requestor.getEmail().equalsIgnoreCase(superAdminEmail) ? Role.SUPER_ADMIN : requestor.getRole();

        // Only SUPER_ADMIN can permanently delete users
        if (requestorRole != Role.SUPER_ADMIN) {
            throw new RuntimeException("Only a super admin can permanently delete user accounts.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Prevent deleting the super admin
        if (user.getEmail().equalsIgnoreCase(superAdminEmail)) {
            throw new RuntimeException("Cannot delete the primary super admin account.");
        }

        log.warn("PERMANENT DELETE initiated by {} for user {} ({})", requestorEmail, user.getId(), user.getEmail());

        // Delete all related data in dependency order
        attendanceRepository.deleteAllByUser(user);
        timetableRepository.deleteAllByUser(user);
        assignmentRepository.deleteAllByUser(user);
        todoRepository.deleteAllByUser(user);
        marksRepository.deleteAllByUser(user);
        feesRepository.deleteAllByUser(user);
        expenseRepository.deleteAllByUser(user);
        expenseCategoryRepository.deleteAllByUser(user);
        subjectRepository.deleteAllByUser(user);
        profileRepository.deleteByUser(user);

        // Finally, delete the user
        userRepository.delete(user);

        log.info("User {} ({}) permanently deleted by {}", user.getId(), user.getEmail(), requestorEmail);
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
