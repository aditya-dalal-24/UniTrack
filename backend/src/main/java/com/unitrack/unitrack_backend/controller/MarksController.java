package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.MarksRequest;
import com.unitrack.unitrack_backend.dto.response.MarksResponse;
import com.unitrack.unitrack_backend.dto.response.MarksSummaryResponse;
import com.unitrack.unitrack_backend.service.MarksService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/marks")
@RequiredArgsConstructor
public class MarksController {

    private final MarksService marksService;

    @GetMapping
    public ResponseEntity<MarksSummaryResponse> getSummary(
            Principal principal,
            @RequestParam(required = false) Integer semester) {
        return ResponseEntity.ok(marksService.getSummary(principal, semester));
    }

    @PostMapping
    public ResponseEntity<MarksResponse> create(Principal principal,
                                               @Valid @RequestBody MarksRequest request) {
        return ResponseEntity.ok(marksService.create(principal, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MarksResponse> update(Principal principal,
                                               @PathVariable Long id,
                                               @Valid @RequestBody MarksRequest request) {
        return ResponseEntity.ok(marksService.update(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        marksService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}