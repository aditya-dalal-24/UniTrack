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
import java.time.LocalDate;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<?> getAttendance(Principal principal, 
                                           @RequestParam(required = false) LocalDate date) {
        if (date != null) {
            return ResponseEntity.ok(attendanceService.getByDate(principal, date));
        }
        return ResponseEntity.ok(attendanceService.getSummary(principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AttendanceResponse> updateRecord(Principal principal, 
                                                           @PathVariable Long id, 
                                                           @Valid @RequestBody AttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.updateRecord(principal, id, request));
    }

    @GetMapping("/today")
    public ResponseEntity<?> getTodayLectures(Principal principal) {
        return ResponseEntity.ok(attendanceService.getTodayLectures(principal));
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

    @DeleteMapping("/date/{date}")
    public ResponseEntity<Void> deleteByDate(Principal principal, @PathVariable String date) {
        attendanceService.deleteByDate(principal, LocalDate.parse(date));
        return ResponseEntity.noContent().build();
    }
}