package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.TimetableSlotRequest;
import com.unitrack.unitrack_backend.dto.response.TimetableSlotResponse;
import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.TimetableSlot;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.SubjectRepository;
import com.unitrack.unitrack_backend.repository.TimetableRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import com.unitrack.unitrack_backend.repository.AttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private TimetableSlotResponse mapSlot(TimetableSlot slot) {
        // Prefer subjectName column; fall back to linked Subject entity's name
        String resolvedName = slot.getSubjectName();
        if ((resolvedName == null || resolvedName.isBlank()) && slot.getSubject() != null) {
            resolvedName = slot.getSubject().getName();
        }

        return TimetableSlotResponse.builder()
                .id(slot.getId())
                .dayOfWeek(slot.getDayOfWeek())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .subjectName(resolvedName)
                .subjectFullName(slot.getSubjectFullName())
                .courseCode(slot.getCourseCode())
                .professor(slot.getProfessor())
                .roomNumber(slot.getRoomNumber())
                .groupInfo(slot.getGroupInfo())
                .subjectId(slot.getSubject() != null ? slot.getSubject().getId() : null)
                .isBreak(slot.getIsBreak())
                .build();
    }

    // Timetable slot methods
    public List<TimetableSlotResponse> getSlots(Principal principal) {
        User user = getUser(principal);
        return timetableRepository.findByUserOrderByDayOfWeekAscStartTimeAsc(user)
                .stream().map(this::mapSlot).collect(Collectors.toList());
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public TimetableSlotResponse addSlot(Principal principal, TimetableSlotRequest request) {
        User user = getUser(principal);
        TimetableSlot slot = TimetableSlot.builder()
                .user(user)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .subjectName(request.getSubjectName())
                .courseCode(request.getCourseCode())
                .professor(request.getProfessor())
                .roomNumber(request.getRoomNumber())
                .groupInfo(request.getGroupInfo())
                .isBreak(request.getIsBreak())
                .build();

        if (request.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            slot.setSubject(subject);
            // Auto-populate subjectName from linked Subject if not provided
            if (slot.getSubjectName() == null || slot.getSubjectName().isBlank()) {
                slot.setSubjectName(subject.getName());
            }
        }

        timetableRepository.save(slot);
        return mapSlot(slot);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public TimetableSlotResponse updateSlot(Principal principal, Long id, TimetableSlotRequest request) {
        User user = getUser(principal);
        TimetableSlot slot = timetableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));
        if (!slot.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        slot.setDayOfWeek(request.getDayOfWeek());
        slot.setStartTime(request.getStartTime());
        slot.setEndTime(request.getEndTime());
        slot.setSubjectName(request.getSubjectName());
        slot.setCourseCode(request.getCourseCode());
        slot.setProfessor(request.getProfessor());
        slot.setRoomNumber(request.getRoomNumber());
        slot.setGroupInfo(request.getGroupInfo());
        slot.setIsBreak(request.getIsBreak());

        if (request.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            slot.setSubject(subject);
            // Auto-populate subjectName from linked Subject if not provided
            if (slot.getSubjectName() == null || slot.getSubjectName().isBlank()) {
                slot.setSubjectName(subject.getName());
            }
        } else {
            slot.setSubject(null);
        }

        timetableRepository.save(slot);
        return mapSlot(slot);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public void deleteSlot(Principal principal, Long id) {
        User user = getUser(principal);
        TimetableSlot slot = timetableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));
        if (!slot.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        attendanceRepository.deleteByTimetableSlot(slot);
        timetableRepository.delete(slot);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public void deleteAllSlots(Principal principal) {
        User user = getUser(principal);
        attendanceRepository.deleteAllByUser(user);
        timetableRepository.deleteAllByUser(user);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public List<TimetableSlotResponse> saveBatch(Principal principal, List<TimetableSlotRequest> requests) {
        User user = getUser(principal);

        // 1. Clear existing data to replace with new batch
        attendanceRepository.deleteAllByUser(user);
        timetableRepository.deleteAllByUser(user);

        // 2. Clear subjects and their attendance for THIS SEMESTER ONLY
        Integer semester = user.getSemester() != null ? user.getSemester() : 1;
        List<Subject> existingSubjects = subjectRepository.findByUserAndSemester(user, semester);
        for (Subject s : existingSubjects) {
            attendanceRepository.deleteBySubject(s);
        }
        subjectRepository.deleteAll(existingSubjects);
        subjectRepository.flush();

        // 3. Process new slots
        Map<String, Subject> subjectCache = new HashMap<>();
        Set<String> seenKeys = new HashSet<>();
        semester = user.getSemester() != null ? user.getSemester() : 1;
        List<TimetableSlot> slotsToSave = new ArrayList<>();

        for (TimetableSlotRequest req : requests) {
            // Deduplicate incoming requests
            String day = req.getDayOfWeek() != null ? req.getDayOfWeek().toUpperCase() : "UNKNOWN";
            String start = req.getStartTime() != null ? req.getStartTime() : "";
            String subName = req.getSubjectName() != null ? req.getSubjectName() : "";

            String prof = req.getProfessor() != null ? req.getProfessor() : "";
            String slotKey = String.format("%s|%s|%s|%s", day, start, subName, prof);
            if (!seenKeys.add(slotKey))
                continue;

            TimetableSlot slot = TimetableSlot.builder()
                    .user(user)
                    .dayOfWeek(day)
                    .startTime(req.getStartTime())
                    .endTime(req.getEndTime())
                    .subjectName(req.getSubjectName())
                    .subjectFullName(req.getSubjectFullName())
                    .courseCode(req.getCourseCode())
                    .professor(req.getProfessor())
                    .roomNumber(req.getRoomNumber())
                    .groupInfo(req.getGroupInfo())
                    .isBreak(req.getIsBreak() != null && req.getIsBreak())
                    .build();

            // Link Subject entity if it's not a break
            if (!slot.getIsBreak() && req.getSubjectName() != null && !req.getSubjectName().isBlank()) {
                String cacheKey = (req.getSubjectName().toLowerCase().trim() + "|" + 
                                  (req.getProfessor() != null ? req.getProfessor().toLowerCase().trim() : "")).trim();
                Subject subject = subjectCache.get(cacheKey);

                if (subject == null) {
                    subject = Subject.builder()
                            .user(user)
                            .name(req.getSubjectName())
                            .fullName(req.getSubjectFullName())
                            .courseCode(req.getCourseCode())
                            .professor(req.getProfessor())
                            .roomNumber(req.getRoomNumber())
                            .color(req.getColor() != null ? req.getColor() : "#6366f1")
                            .semester(semester)
                            .build();
                    subject = subjectRepository.save(subject);
                    subjectCache.put(cacheKey, subject);
                }
                slot.setSubject(subject);
            }

            slotsToSave.add(slot);
        }

        List<TimetableSlot> saved = timetableRepository.saveAll(slotsToSave);
        timetableRepository.flush();

        return saved.stream().map(this::mapSlot).collect(Collectors.toList());
    }
}