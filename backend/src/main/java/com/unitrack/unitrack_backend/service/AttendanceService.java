package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.AttendanceRequest;
import com.unitrack.unitrack_backend.dto.response.AttendanceResponse;
import com.unitrack.unitrack_backend.dto.response.AttendanceSummaryResponse;
import com.unitrack.unitrack_backend.entity.AttendanceRecord;
import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.AttendanceRepository;
import com.unitrack.unitrack_backend.repository.SubjectRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import com.unitrack.unitrack_backend.entity.Subject;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private AttendanceResponse mapToResponse(AttendanceRecord record) {
        return AttendanceResponse.builder()
                .id(record.getId())
                .date(record.getDate())
                .status(record.getStatus())
                .subjectId(record.getSubject() != null ? record.getSubject().getId() : null)
                .subjectName(record.getSubject() != null ? record.getSubject().getName() : null)
                .note(record.getNote())
                .build();
    }

    public AttendanceSummaryResponse getSummary(Principal principal) {
        User user = getUser(principal);
        List<AttendanceRecord> records = attendanceRepository.findByUserOrderByDateDesc(user);

        long present = attendanceRepository.countByUserAndStatus(user, AttendanceStatus.PRESENT);
        long absent = attendanceRepository.countByUserAndStatus(user, AttendanceStatus.ABSENT);
        long workingDays = present + absent;
        double percentage = workingDays > 0 ? (present * 100.0 / workingDays) : 0.0;

        List<AttendanceResponse> responseList = records.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return AttendanceSummaryResponse.builder()
                .totalWorkingDays(workingDays)
                .presentDays(present)
                .absentDays(absent)
                .attendancePercentage(Math.round(percentage * 100.0) / 100.0)
                .records(responseList)
                .build();
    }

    public AttendanceResponse addRecord(Principal principal, AttendanceRequest request) {
        User user = getUser(principal);

        AttendanceRecord record;

        if (request.getSubjectId() != null) {
            // Lecture-wise: find by user + date + subject
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            record = attendanceRepository.findByUserAndDateAndSubject(user, request.getDate(), subject)
                    .orElse(AttendanceRecord.builder().user(user).subject(subject).build());
            record.setSubject(subject);
        } else {
            // General (no subject): find by user + date + null subject
            record = attendanceRepository.findByUserAndDateAndSubjectIsNull(user, request.getDate())
                    .orElse(AttendanceRecord.builder().user(user).build());
            record.setSubject(null);
        }

        record.setDate(request.getDate());
        record.setStatus(request.getStatus());
        record.setNote(request.getNote());

        attendanceRepository.save(record);
        return mapToResponse(record);
    }

    public void deleteRecord(Principal principal, Long id) {
        User user = getUser(principal);
        AttendanceRecord record = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (!record.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        attendanceRepository.delete(record);
    }

    public void deleteByDate(Principal principal, java.time.LocalDate date) {
        User user = getUser(principal);
        attendanceRepository.deleteByUserAndDate(user, date);
    }
}