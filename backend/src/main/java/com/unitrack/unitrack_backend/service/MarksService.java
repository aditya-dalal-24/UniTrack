package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.MarksRequest;
import com.unitrack.unitrack_backend.dto.response.MarksResponse;
import com.unitrack.unitrack_backend.dto.response.MarksSummaryResponse;
import com.unitrack.unitrack_backend.entity.Marks;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.MarksRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarksService {

    private final MarksRepository marksRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private MarksResponse mapToResponse(Marks mark) {
        return MarksResponse.builder()
                .id(mark.getId())
                .subjectName(mark.getSubjectName())
                .subjectCode(mark.getSubjectCode())
                .semester(mark.getSemester())
                .credits(mark.getCredits())
                .midSem(mark.getMidSem())
                .internals(mark.getInternals())
                .endSem(mark.getEndSem())
                .finalScore(mark.getFinalScore())
                .grade(mark.getGrade())
                .gradePoints(mark.getGradePoints())
                .build();
    }

    private Double calculateSgpa(List<Marks> marks) {
        List<Marks> valid = marks.stream()
                .filter(m -> m.getGradePoints() != null && m.getCredits() != null)
                .collect(Collectors.toList());
        if (valid.isEmpty()) return 0.0;
        double totalPoints = valid.stream()
                .mapToDouble(m -> m.getGradePoints() * m.getCredits()).sum();
        double totalCredits = valid.stream()
                .mapToDouble(Marks::getCredits).sum();
        return totalCredits > 0 ?
                Math.round((totalPoints / totalCredits) * 100.0) / 100.0 : 0.0;
    }

    public MarksSummaryResponse getSummary(Principal principal, Integer semester) {
        User user = getUser(principal);

        List<Marks> allMarks = marksRepository.findByUser(user);
        List<Marks> filteredMarks = semester != null
                ? marksRepository.findByUserAndSemester(user, semester)
                : allMarks;

        // Calculate CGPA across all marks
        Double cgpa = calculateSgpa(allMarks);

        // Calculate current SGPA for filtered marks
        Double sgpa = calculateSgpa(filteredMarks);

        // Get current semester (highest semester number)
        Integer currentSemester = allMarks.stream()
                .filter(m -> m.getSemester() != null)
                .mapToInt(Marks::getSemester)
                .max().orElse(0);

        List<MarksResponse> responses = filteredMarks.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return MarksSummaryResponse.builder()
                .cgpa(cgpa)
                .currentSgpa(sgpa)
                .totalSubjects(filteredMarks.size())
                .currentSemester(currentSemester)
                .marks(responses)
                .build();
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public MarksResponse create(Principal principal, MarksRequest request) {
        User user = getUser(principal);
        Marks mark = Marks.builder()
                .user(user)
                .subjectName(request.getSubjectName())
                .subjectCode(request.getSubjectCode())
                .semester(request.getSemester())
                .credits(request.getCredits())
                .midSem(request.getMidSem())
                .internals(request.getInternals())
                .endSem(request.getEndSem())
                .finalScore(request.getFinalScore())
                .grade(request.getGrade())
                .gradePoints(request.getGradePoints())
                .build();
        marksRepository.save(mark);
        return mapToResponse(mark);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public MarksResponse update(Principal principal, Long id, MarksRequest request) {
        User user = getUser(principal);
        Marks mark = marksRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found"));
        if (!mark.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        mark.setSubjectName(request.getSubjectName());
        mark.setSubjectCode(request.getSubjectCode());
        mark.setSemester(request.getSemester());
        mark.setCredits(request.getCredits());
        mark.setMidSem(request.getMidSem());
        mark.setInternals(request.getInternals());
        mark.setEndSem(request.getEndSem());
        mark.setFinalScore(request.getFinalScore());
        mark.setGrade(request.getGrade());
        mark.setGradePoints(request.getGradePoints());
        marksRepository.save(mark);
        return mapToResponse(mark);
    }

    @CacheEvict(value = "dashboard", key = "#principal.name")
    public void delete(Principal principal, Long id) {
        User user = getUser(principal);
        Marks mark = marksRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mark not found"));
        if (!mark.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        marksRepository.delete(mark);
    }
}