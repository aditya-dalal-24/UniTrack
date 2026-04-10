package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.response.DashboardResponse;
import com.unitrack.unitrack_backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(Principal principal) {
        return ResponseEntity.ok(dashboardService.getDashboard(principal));
    }
}