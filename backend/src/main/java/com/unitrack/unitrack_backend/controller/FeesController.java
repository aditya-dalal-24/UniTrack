package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.FeesRequest;
import com.unitrack.unitrack_backend.dto.response.FeesResponse;
import com.unitrack.unitrack_backend.dto.response.FeesSummaryResponse;
import com.unitrack.unitrack_backend.service.FeesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
public class FeesController {

    private final FeesService feeService;

    @GetMapping
    public ResponseEntity<FeesSummaryResponse> getSummary(
            Principal principal,
            @RequestParam(required = false) Integer semester) {
        return ResponseEntity.ok(feeService.getSummary(principal, semester));
    }

    @PostMapping
    public ResponseEntity<FeesResponse> create(Principal principal,
                                              @RequestBody FeesRequest request) {
        return ResponseEntity.ok(feeService.create(principal, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeesResponse> update(Principal principal,
                                              @PathVariable Long id,
                                              @RequestBody FeesRequest request) {
        return ResponseEntity.ok(feeService.update(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        feeService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}