package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.TimetableSlotRequest;
import com.unitrack.unitrack_backend.dto.response.TimetablePreviewResponse;
import com.unitrack.unitrack_backend.dto.response.TimetableSlotResponse;
import com.unitrack.unitrack_backend.service.TimetableParserService;
import com.unitrack.unitrack_backend.service.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
@Slf4j
public class TimetableController {

    private final TimetableService timetableService;
    private final TimetableParserService parserService;

    // ==================== UPLOAD / PARSE ====================

    @PostMapping("/upload")
    public ResponseEntity<?> uploadTimetableFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please upload a valid .xlsx or .pdf file.");
        }
        try {
            TimetablePreviewResponse response = parserService.parseFile(file);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to parse timetable file.", e);
            return ResponseEntity.badRequest()
                    .body(e.getMessage() != null ? e.getMessage()
                            : "Failed to parse the file. Ensure it matches a standard timetable format.");
        }
    }

    // ==================== SLOT CRUD ====================

    @GetMapping
    public ResponseEntity<List<TimetableSlotResponse>> getSlots(Principal principal) {
        return ResponseEntity.ok(timetableService.getSlots(principal));
    }

    @PostMapping
    public ResponseEntity<TimetableSlotResponse> addSlot(Principal principal,
                                                         @Valid @RequestBody TimetableSlotRequest request) {
        return ResponseEntity.ok(timetableService.addSlot(principal, request));
    }

    @PostMapping("/batch")
    public ResponseEntity<List<TimetableSlotResponse>> saveBatch(Principal principal,
                                                                 @RequestBody List<TimetableSlotRequest> requests) {
        return ResponseEntity.ok(timetableService.saveBatch(principal, requests));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TimetableSlotResponse> updateSlot(Principal principal,
                                                            @PathVariable Long id,
                                                            @Valid @RequestBody TimetableSlotRequest request) {
        return ResponseEntity.ok(timetableService.updateSlot(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSlot(Principal principal, @PathVariable Long id) {
        timetableService.deleteSlot(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAllSlots(Principal principal) {
        timetableService.deleteAllSlots(principal);
        return ResponseEntity.noContent().build();
    }
}