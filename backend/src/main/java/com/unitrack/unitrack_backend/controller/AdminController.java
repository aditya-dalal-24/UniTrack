package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.ChangeRoleRequest;
import com.unitrack.unitrack_backend.dto.response.AdminStatsResponse;
import com.unitrack.unitrack_backend.dto.response.AdminUserResponse;
import com.unitrack.unitrack_backend.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size);
            return ResponseEntity.ok(adminService.getAllUsersPaged(pageable));
        }
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @PutMapping("/users/{id}/activate")
    public ResponseEntity<AdminUserResponse> activateUser(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(adminService.activateUser(id, auth.getName()));
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<AdminUserResponse> deactivateUser(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(adminService.deactivateUser(id, auth.getName()));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<AdminUserResponse> changeRole(
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoleRequest request,
            Authentication auth) {
        return ResponseEntity.ok(adminService.changeUserRole(id, request.getRole(), auth.getName()));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, Authentication auth) {
        adminService.deleteUser(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
