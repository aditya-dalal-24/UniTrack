package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.SubjectRequest;
import com.unitrack.unitrack_backend.dto.response.SubjectResponse;
import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.AttendanceRepository;
import com.unitrack.unitrack_backend.repository.SubjectRepository;
import com.unitrack.unitrack_backend.repository.TimetableRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final TimetableRepository timetableRepository;
    private final AttendanceRepository attendanceRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private SubjectResponse mapSubject(Subject subject) {
        return SubjectResponse.builder()
                .id(subject.getId())
                .name(subject.getName())
                .fullName(subject.getFullName())
                .courseCode(subject.getCourseCode())
                .professor(subject.getProfessor())
                .roomNumber(subject.getRoomNumber())
                .color(subject.getColor())
                .semester(subject.getSemester())
                .build();
    }

    public List<SubjectResponse> getSubjects(Principal principal, Integer semester) {
        User user = getUser(principal);
        
        if (semester == null) {
            semester = user.getSemester() != null ? user.getSemester() : 1;
        }

        // Return subjects for the requested semester OR subjects with no semester (global)
        return subjectRepository.findByUserAndSemesterOrSemesterIsNull(user, semester)
                .stream().map(this::mapSubject).collect(Collectors.toList());
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
        public SubjectResponse addSubject(Principal principal, SubjectRequest request) {
        User user = getUser(principal);
        // Use semester from request if provided, otherwise default to user's registered
        // semester
        Integer semester = request.getSemester();
        if (semester == null) {
            semester = user.getSemester() != null ? user.getSemester() : 1;
        }

        Subject subject = Subject.builder()
                .user(user)
                .semester(semester)
                .name(request.getName())
                .fullName(request.getFullName())
                .courseCode(request.getCourseCode())
                .professor(request.getProfessor())
                .roomNumber(request.getRoomNumber())
                .color(request.getColor())
                .build();
        subjectRepository.save(subject);
        return mapSubject(subject);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    @Transactional
    public SubjectResponse updateSubject(Principal principal, Long id, SubjectRequest request) {
        User user = getUser(principal);
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        subject.setName(request.getName());
        subject.setFullName(request.getFullName());
        subject.setCourseCode(request.getCourseCode());
        subject.setProfessor(request.getProfessor());
        subject.setRoomNumber(request.getRoomNumber());
        subject.setColor(request.getColor());

        subjectRepository.save(subject);

        // Cascade update to timetable slots
        List<com.unitrack.unitrack_backend.entity.TimetableSlot> slots = timetableRepository.findBySubject(subject);
        for (com.unitrack.unitrack_backend.entity.TimetableSlot slot : slots) {
            slot.setSubjectName(subject.getName());
            slot.setSubjectFullName(subject.getFullName());
            slot.setCourseCode(subject.getCourseCode());
            slot.setProfessor(subject.getProfessor());
            slot.setRoomNumber(subject.getRoomNumber());
        }
        timetableRepository.saveAll(slots);

        return mapSubject(subject);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    @Transactional
    public void deleteSubject(Principal principal, Long id) {
        User user = getUser(principal);
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        // Clear FK references in timetable_slots (set subject_id = null, keep the slot)
        timetableRepository.nullifySubjectReferences(subject);

        // Delete attendance records linked to this subject
        attendanceRepository.deleteBySubject(subject);

        subjectRepository.delete(subject);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    @Transactional
    public void deleteAllSubjects(Principal principal) {
        User user = getUser(principal);
        // Delete all timetable slots first (they reference subjects)
        timetableRepository.deleteAllByUser(user);
        // Then delete all subjects and their attendance records
        List<Subject> subjects = subjectRepository.findByUser(user);
        for (Subject subject : subjects) {
            attendanceRepository.deleteBySubject(subject);
            subjectRepository.delete(subject);
        }
    }
}
