package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.AttendanceRequest;
import com.unitrack.unitrack_backend.dto.response.AttendanceResponse;
import com.unitrack.unitrack_backend.dto.response.AttendanceSummaryResponse;
import com.unitrack.unitrack_backend.entity.AttendanceRecord;
import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.AttendanceRepository;
import com.unitrack.unitrack_backend.repository.TimetableRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import com.unitrack.unitrack_backend.repository.SubjectRepository;
import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.TimetableSlot;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
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
    private final TimetableRepository timetableRepository;
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
                .timetableSlotId(record.getTimetableSlot() != null ? record.getTimetableSlot().getId() : null)
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

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public AttendanceResponse addRecord(Principal principal, AttendanceRequest request) {
        User user = getUser(principal);

        AttendanceRecord record;

        if (request.getTimetableSlotId() != null) {
            // Lecture-wise: find by user + date + subject (to handle labs spanning multiple slots)
            TimetableSlot slot = timetableRepository.findById(request.getTimetableSlotId())
                    .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));
            
            if (slot.getSubject() != null) {
                // Clean up any duplicates first, then find the keeper
                cleanupDuplicates(user, request.getDate(), slot.getSubject());
                record = attendanceRepository.findFirstByUserAndDateAndSubjectOrderByIdDesc(user, request.getDate(), slot.getSubject())
                        .orElse(AttendanceRecord.builder().user(user).subject(slot.getSubject()).timetableSlot(slot).build());
                record.setSubject(slot.getSubject());
            } else {
                record = attendanceRepository.findFirstByUserAndDateAndTimetableSlotOrderByIdDesc(user, request.getDate(), slot)
                        .orElse(AttendanceRecord.builder().user(user).timetableSlot(slot).build());
                record.setTimetableSlot(slot);
            }
        } else if (request.getSubjectId() != null) {
            // Subject-wise: find by user + date + subject
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            cleanupDuplicates(user, request.getDate(), subject);
            record = attendanceRepository.findFirstByUserAndDateAndSubjectOrderByIdDesc(user, request.getDate(), subject)
                    .orElse(AttendanceRecord.builder().user(user).subject(subject).build());
            record.setSubject(subject);
        } else {
            // General (no subject): find by user + date + null subject
            record = attendanceRepository.findFirstByUserAndDateAndSubjectIsNullOrderByIdDesc(user, request.getDate())
                    .orElse(AttendanceRecord.builder().user(user).build());
            record.setSubject(null);
        }

        record.setDate(request.getDate());
        record.setStatus(request.getStatus());
        record.setNote(request.getNote());

        attendanceRepository.save(record);
        return mapToResponse(record);
    }

    /**
     * Removes duplicate attendance records for the same (user, date, subject),
     * keeping only the one with the highest ID.
     */
    private void cleanupDuplicates(User user, java.time.LocalDate date, Subject subject) {
        List<AttendanceRecord> duplicates = attendanceRepository.findAllByUserAndDateAndSubject(user, date, subject);
        if (duplicates.size() > 1) {
            // Sort by ID descending, keep the first (latest), delete the rest
            duplicates.sort((a, b) -> Long.compare(b.getId(), a.getId()));
            for (int i = 1; i < duplicates.size(); i++) {
                attendanceRepository.delete(duplicates.get(i));
            }
            attendanceRepository.flush();
        }
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public AttendanceResponse updateRecord(Principal principal, Long id, AttendanceRequest request) {
        User user = getUser(principal);
        AttendanceRecord record = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (!record.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        record.setStatus(request.getStatus());
        record.setNote(request.getNote());
        
        attendanceRepository.save(record);
        return mapToResponse(record);
    }

    public List<AttendanceResponse> getByDate(Principal principal, java.time.LocalDate date) {
        User user = getUser(principal);
        List<AttendanceRecord> records = attendanceRepository.findByUserOrderByDateDesc(user).stream()
                .filter(r -> r.getDate().equals(date))
                .collect(Collectors.toList());
        return records.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public void deleteRecord(Principal principal, Long id) {
        User user = getUser(principal);
        AttendanceRecord record = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (!record.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        attendanceRepository.delete(record);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public void deleteByDate(Principal principal, java.time.LocalDate date) {
        User user = getUser(principal);
        attendanceRepository.deleteByUserAndDate(user, date);
    }

    public List<com.unitrack.unitrack_backend.dto.response.TodayLectureResponse> getTodayLectures(Principal principal) {
        User user = getUser(principal);
        java.time.LocalDate today = java.time.LocalDate.now();
        String dayOfWeek = today.getDayOfWeek().name(); // e.g. "SATURDAY"

        List<TimetableSlot> slots = timetableRepository.findByUserAndDayOfWeekOrderByStartTimeAsc(user, dayOfWeek);

        return slots.stream()
                .filter(slot -> !Boolean.TRUE.equals(slot.getIsBreak()))
                .map(slot -> {
                    // Look up existing attendance by SUBJECT first (handles labs spanning multiple slots)
                    // Falls back to slot-level lookup only when no subject is linked
                    java.util.Optional<AttendanceRecord> existingRecord;
                    if (slot.getSubject() != null) {
                        existingRecord = attendanceRepository.findFirstByUserAndDateAndSubjectOrderByIdDesc(user, today, slot.getSubject());
                    } else {
                        existingRecord = attendanceRepository.findFirstByUserAndDateAndTimetableSlotOrderByIdDesc(user, today, slot);
                    }

                    String resolvedName = slot.getSubjectName();
                    if ((resolvedName == null || resolvedName.isBlank()) && slot.getSubject() != null) {
                        resolvedName = slot.getSubject().getName();
                    }

                    return com.unitrack.unitrack_backend.dto.response.TodayLectureResponse.builder()
                            .slotId(slot.getId())
                            .subjectName(resolvedName)
                            .subjectFullName(slot.getSubjectFullName())
                            .startTime(slot.getStartTime())
                            .endTime(slot.getEndTime())
                            .professor(slot.getProfessor())
                            .roomNumber(slot.getRoomNumber())
                            .groupInfo(slot.getGroupInfo())
                            .subjectId(slot.getSubject() != null ? slot.getSubject().getId() : null)
                            .attendanceRecordId(existingRecord.map(AttendanceRecord::getId).orElse(null))
                            .status(existingRecord.map(AttendanceRecord::getStatus).orElse(null))
                            .build();
                })
                .collect(Collectors.toList());
    }
}