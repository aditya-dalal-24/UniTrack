package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.SubjectRequest;
import com.unitrack.unitrack_backend.dto.response.SubjectResponse;
import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.SubjectRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private SubjectResponse mapSubject(Subject subject) {
        return SubjectResponse.builder()
                .id(subject.getId())
                .name(subject.getName())
                .courseCode(subject.getCourseCode())
                .professor(subject.getProfessor())
                .build();
    }

    public List<SubjectResponse> getSubjects(Principal principal) {
        User user = getUser(principal);
        return subjectRepository.findByUser(user)
                .stream().map(this::mapSubject).collect(Collectors.toList());
    }

    public SubjectResponse addSubject(Principal principal, SubjectRequest request) {
        User user = getUser(principal);
        Subject subject = Subject.builder()
                .user(user)
                .name(request.getName())
                .courseCode(request.getCourseCode())
                .professor(request.getProfessor())
                .build();
        subjectRepository.save(subject);
        return mapSubject(subject);
    }

    public void deleteSubject(Principal principal, Long id) {
        User user = getUser(principal);
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        subjectRepository.delete(subject);
    }
}
