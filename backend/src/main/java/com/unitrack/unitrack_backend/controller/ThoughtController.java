package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.ThoughtRequest;
import com.unitrack.unitrack_backend.dto.response.ThoughtResponse;
import com.unitrack.unitrack_backend.service.ThoughtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ThoughtController {

    private final ThoughtService thoughtService;

    @GetMapping("/thoughts/today")
    public ResponseEntity<ThoughtResponse> getThoughtOfTheDay() {
        return ResponseEntity.ok(thoughtService.getThoughtOfTheDay());
    }

    @GetMapping("/admin/thoughts")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<ThoughtResponse>> getAllThoughts() {
        return ResponseEntity.ok(thoughtService.getAllThoughts());
    }

    @PostMapping("/admin/thoughts")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ThoughtResponse> addThought(@RequestBody ThoughtRequest request) {
        return ResponseEntity.ok(thoughtService.addThought(request));
    }

    @DeleteMapping("/admin/thoughts/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteThought(@PathVariable Long id) {
        thoughtService.deleteThought(id);
        return ResponseEntity.ok().build();
    }
}
