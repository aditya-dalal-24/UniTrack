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
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private TimetableSlotResponse mapSlot(TimetableSlot slot) {
        return TimetableSlotResponse.builder()
                .id(slot.getId())
                .dayOfWeek(slot.getDayOfWeek())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .subjectName(slot.getSubjectName())
                .courseCode(slot.getCourseCode())
                .professor(slot.getProfessor())
                .roomNumber(slot.getRoomNumber())
                .subjectId(slot.getSubject() != null ? slot.getSubject().getId() : null)
                .build();
    }

    // Timetable slot methods
    public List<TimetableSlotResponse> getSlots(Principal principal) {
        User user = getUser(principal);
        return timetableRepository.findByUserOrderByDayOfWeekAscStartTimeAsc(user)
                .stream().map(this::mapSlot).collect(Collectors.toList());
    }

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
                .build();

        if (request.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            slot.setSubject(subject);
        }

        timetableRepository.save(slot);
        return mapSlot(slot);
    }

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

        if (request.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            slot.setSubject(subject);
        } else {
            slot.setSubject(null);
        }

        timetableRepository.save(slot);
        return mapSlot(slot);
    }

    public void deleteSlot(Principal principal, Long id) {
        User user = getUser(principal);
        TimetableSlot slot = timetableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));
        if (!slot.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        timetableRepository.delete(slot);
    }
}