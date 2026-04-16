package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.TimetableSlotRequest;
import com.unitrack.unitrack_backend.dto.response.TimetableSlotResponse;
import com.unitrack.unitrack_backend.service.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    // Slot endpoints
    @GetMapping
    public ResponseEntity<List<TimetableSlotResponse>> getSlots(Principal principal) {
        return ResponseEntity.ok(timetableService.getSlots(principal));
    }

    @PostMapping
    public ResponseEntity<TimetableSlotResponse> addSlot(Principal principal,
                                                         @Valid @RequestBody TimetableSlotRequest request) {
        return ResponseEntity.ok(timetableService.addSlot(principal, request));
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