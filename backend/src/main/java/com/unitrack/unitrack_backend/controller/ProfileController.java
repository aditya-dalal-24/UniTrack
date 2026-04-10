package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.ProfileRequest;
import com.unitrack.unitrack_backend.dto.response.ProfileResponse;
import com.unitrack.unitrack_backend.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(Principal principal) {
        return ResponseEntity.ok(profileService.getProfile(principal));
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(Principal principal,
                                                         @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(principal, request));
    }
}