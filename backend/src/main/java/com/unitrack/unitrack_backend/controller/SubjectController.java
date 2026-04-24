package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.SubjectRequest;
import com.unitrack.unitrack_backend.dto.response.SubjectResponse;
import com.unitrack.unitrack_backend.service.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    public ResponseEntity<List<SubjectResponse>> getSubjects(@RequestParam(required = false) Integer semester,
                                                            Principal principal) {
        return ResponseEntity.ok(subjectService.getSubjects(principal, semester));
    }

    @PostMapping
    public ResponseEntity<SubjectResponse> addSubject(Principal principal,
                                                      @Valid @RequestBody SubjectRequest request) {
        return ResponseEntity.ok(subjectService.addSubject(principal, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubjectResponse> updateSubject(Principal principal,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody SubjectRequest request) {
        return ResponseEntity.ok(subjectService.updateSubject(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubject(Principal principal, @PathVariable Long id) {
        subjectService.deleteSubject(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAllSubjects(Principal principal) {
        subjectService.deleteAllSubjects(principal);
        return ResponseEntity.noContent().build();
    }
}
