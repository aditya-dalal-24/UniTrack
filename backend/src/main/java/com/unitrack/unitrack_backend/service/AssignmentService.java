package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.AssignmentRequest;
import com.unitrack.unitrack_backend.dto.response.AssignmentResponse;
import com.unitrack.unitrack_backend.entity.Assignment;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.AssignmentRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private AssignmentResponse mapToResponse(Assignment assignment) {
        return AssignmentResponse.builder()
                .id(assignment.getId())
                .title(assignment.getTitle())
                .subject(assignment.getSubject())
                .dueDate(assignment.getDueDate())
                .status(assignment.getStatus())
                .build();
    }

    public List<AssignmentResponse> getAll(Principal principal) {
        User user = getUser(principal);
        return assignmentRepository.findByUserOrderByDueDateAsc(user)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public AssignmentResponse create(Principal principal, AssignmentRequest request) {
        User user = getUser(principal);
        Assignment assignment = Assignment.builder()
                .user(user)
                .title(request.getTitle())
                .subject(request.getSubject())
                .dueDate(request.getDueDate())
                .status(request.getStatus() != null ? request.getStatus() :
                        com.unitrack.unitrack_backend.entity.AssignmentStatus.PENDING)
                .build();
        assignmentRepository.save(assignment);
        return mapToResponse(assignment);
    }

    public AssignmentResponse update(Principal principal, Long id, AssignmentRequest request) {
        User user = getUser(principal);
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        if (!assignment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        assignment.setTitle(request.getTitle());
        assignment.setSubject(request.getSubject());
        assignment.setDueDate(request.getDueDate());
        assignment.setStatus(request.getStatus());
        assignmentRepository.save(assignment);
        return mapToResponse(assignment);
    }

    public void delete(Principal principal, Long id) {
        User user = getUser(principal);
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        if (!assignment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        assignmentRepository.delete(assignment);
    }
}