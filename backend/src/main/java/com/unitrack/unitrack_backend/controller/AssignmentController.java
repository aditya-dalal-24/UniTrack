package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.AssignmentRequest;
import com.unitrack.unitrack_backend.dto.response.AssignmentResponse;
import com.unitrack.unitrack_backend.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> getAll(Principal principal) {
        return ResponseEntity.ok(assignmentService.getAll(principal));
    }

    @PostMapping
    public ResponseEntity<AssignmentResponse> create(Principal principal,
                                                     @Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(assignmentService.create(principal, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AssignmentResponse> update(Principal principal,
                                                     @PathVariable Long id,
                                                     @Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(assignmentService.update(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        assignmentService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}