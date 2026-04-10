package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.AttendanceRequest;
import com.unitrack.unitrack_backend.dto.response.AttendanceResponse;
import com.unitrack.unitrack_backend.dto.response.AttendanceSummaryResponse;
import com.unitrack.unitrack_backend.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<AttendanceSummaryResponse> getSummary(Principal principal) {
        return ResponseEntity.ok(attendanceService.getSummary(principal));
    }

    @PostMapping
    public ResponseEntity<AttendanceResponse> addRecord(Principal principal,
                                                        @Valid @RequestBody AttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.addRecord(principal, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecord(Principal principal, @PathVariable Long id) {
        attendanceService.deleteRecord(principal, id);
        return ResponseEntity.noContent().build();
    }
}